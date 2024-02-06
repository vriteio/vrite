import { WeaviateClient } from "weaviate-ts-client";
import {
  createOutputTransformer,
  GenericJSONContentNode,
  createContentWalker,
  JSONContentNodeWalker,
  JSONContentNode
} from "@vrite/sdk/transformers";
import { ObjectId, Db } from "mongodb";
import { FastifyInstance } from "fastify";
import { convert as convertToText } from "html-to-text";
import {
  FullContentGroup,
  FullContentPiece,
  FullContents,
  FullContentVariant,
  getContentGroupsCollection,
  getContentsCollection,
  getContentVariantsCollection
} from "#collections";
import { UnderscoreID } from "#lib/mongo";

interface WhereOperand {
  path: string[];
  operator: "Equal" | "ContainsAny";
  valueText?: string;
  valueInt?: number;
  valueTextArray?: string[];
}

type SearchIndexingProcessor<D extends object> = (
  input: {
    fastify: FastifyInstance;
    client: WeaviateClient;
  },
  data: D
) => Promise<void>;
type SearchContentHandlerData<
  F extends (fastify: FastifyInstance, client: WeaviateClient, data: any) => void
> = Parameters<F>[2];

const getParentContentGroup = async (
  fastify: FastifyInstance,
  contentPiece: Pick<UnderscoreID<FullContentPiece<ObjectId>>, "contentGroupId">
): Promise<UnderscoreID<FullContentGroup<ObjectId>> | null> => {
  const contentGroupsCollection = getContentGroupsCollection(fastify.mongo.db!);

  return (
    contentGroupsCollection.findOne({
      _id: contentPiece.contentGroupId
    }) || null
  );
};
const getParentContentGroups = async (
  fastify: FastifyInstance,
  contentPieces: Array<Pick<UnderscoreID<FullContentPiece<ObjectId>>, "contentGroupId">>
): Promise<Array<UnderscoreID<FullContentGroup<ObjectId>> | null>> => {
  const contentGroupsCollection = getContentGroupsCollection(fastify.mongo.db!);
  const contentGroups = await contentGroupsCollection
    .find({ _id: { $in: contentPieces.map((contentPiece) => contentPiece.contentGroupId) } })
    .toArray();

  return contentPieces.map((contentPiece) => {
    return (
      contentGroups.find((contentGroup) => {
        return contentGroup._id.equals(contentPiece.contentGroupId);
      }) || null
    );
  });
};
const getContentGroupIds = (
  contentPiece: UnderscoreID<FullContentPiece<ObjectId>>,
  contentGroup?: UnderscoreID<FullContentGroup<ObjectId>> | null
): string[] => {
  if (contentGroup) {
    return [
      ...contentGroup.ancestors.map((ancestorId) => `${ancestorId}`),
      `${contentPiece.contentGroupId}`
    ];
  }

  return [`${contentPiece.contentGroupId}`];
};
const rawTextOutputTransformer = createOutputTransformer((content) => {
  const nodeToText = (node: GenericJSONContentNode, separator?: string): string => {
    if (node.type === "text") return node.text || "";
    if (node.type === "hardBreak") return "\n";

    let hasTextContent = false;

    return (
      node.content
        ?.map((node) => {
          if (node.type === "text") hasTextContent = true;

          return nodeToText(node);
        })
        .join(separator || (hasTextContent ? "" : "\n")) || ""
    );
  };

  return nodeToText(content, "\n");
});
const fragmentedContentProcessor = (
  content: GenericJSONContentNode,
  contentPiece: UnderscoreID<FullContentPiece<ObjectId>>
): Array<{ breadcrumb: string[]; content: string; type: "content" | "description" }> => {
  const walker = createContentWalker(content) as JSONContentNodeWalker<JSONContentNode["doc"]>;
  const sections: Array<{
    breadcrumb: string[];
    content: string;
    type: "content" | "description";
  }> = [];
  const paragraphsToSection = (paragraphs: GenericJSONContentNode[]): string => {
    return rawTextOutputTransformer({
      type: "doc",
      content: paragraphs
    }).trim();
  };
  const currentHeadings = [contentPiece.title, "", "", "", "", "", ""];

  let paragraphs: GenericJSONContentNode[] = [];

  walker.children.forEach((child) => {
    const nodeType = child.node.type;

    if (nodeType === "heading") {
      if (paragraphs.length > 0) {
        const section = paragraphsToSection(paragraphs);

        if (section.length === 0 || section.length >= 2) {
          sections.push({
            breadcrumb: currentHeadings.filter(Boolean),
            content: section,
            type: "content"
          });
        }

        paragraphs = [];
      }

      currentHeadings[child.node.attrs.level] = rawTextOutputTransformer({
        type: "doc",
        content: [child.node]
      }).trim();

      for (let i = child.node.attrs.level + 1; i < currentHeadings.length; i++) {
        currentHeadings[i] = "";
      }
    }

    if (
      nodeType === "paragraph" ||
      nodeType === "blockquote" ||
      nodeType === "bulletList" ||
      nodeType === "orderedList" ||
      nodeType === "taskList" ||
      nodeType === "table" ||
      nodeType === "codeBlock"
    ) {
      paragraphs.push(child.node);
    }
  });

  if (paragraphs.length > 0) {
    const section = paragraphsToSection(paragraphs);

    if (section.length >= 2) {
      sections.push({
        breadcrumb: [...currentHeadings.values()].filter(Boolean),
        content: section,
        type: "content"
      });
    }
  }

  sections.push({
    breadcrumb: [contentPiece.title],
    content: convertToText(contentPiece.description || "", { wordwrap: false }),
    type: "description"
  });

  return sections;
};
const getContentBuffer = async (
  db: Db,
  contentPieceId: ObjectId,
  variantId?: ObjectId | string
): Promise<Buffer | undefined> => {
  const contentsCollection = getContentsCollection(db);
  const contentVariantsCollection = getContentVariantsCollection(db);

  if (variantId) {
    const contentVariant = await contentVariantsCollection.findOne({
      contentPieceId,
      variantId: new ObjectId(variantId)
    });

    if (contentVariant?.content) return Buffer.from(contentVariant?.content.buffer);
  } else {
    const content = await contentsCollection.findOne({
      contentPieceId
    });

    if (content?.content) return Buffer.from(content?.content.buffer);
  }
};
const getContentBuffers = async (
  db: Db,
  entries: Array<{
    contentPieceId: ObjectId;
    variantId?: ObjectId | string;
  }>
): Promise<Array<Buffer | null>> => {
  const contentsCollection = getContentsCollection(db);
  const contentVariantsCollection = getContentVariantsCollection(db);
  const contentVariantsFilter = {
    $or: entries
      .filter((entry) => entry.variantId)
      .map(({ contentPieceId, variantId }) => {
        return {
          contentPieceId,
          variantId: new ObjectId(variantId)
        };
      })
  };
  const contentsFilter = {
    $or: entries
      .filter((entry) => !entry.variantId)
      .map(({ contentPieceId }) => {
        return {
          contentPieceId
        };
      })
  };

  let contentVariants: UnderscoreID<FullContentVariant<ObjectId>>[] = [];
  let contents: UnderscoreID<FullContents<ObjectId>>[] = [];

  if (contentVariantsFilter.$or.length > 0) {
    contentVariants = await contentVariantsCollection.find(contentVariantsFilter).toArray();
  }

  if (contentsFilter.$or.length > 0) {
    contents = await contentsCollection.find(contentsFilter).toArray();
  }

  return entries.map((entry) => {
    if (entry.variantId) {
      const contentVariant = contentVariants.find((contentVariant) => {
        return (
          contentVariant.contentPieceId.equals(entry.contentPieceId) &&
          contentVariant.variantId.equals(entry.variantId!)
        );
      });

      if (contentVariant?.content) return Buffer.from(contentVariant?.content.buffer);
    } else {
      const content = contents.find((content) => {
        return content.contentPieceId.equals(entry.contentPieceId);
      });

      if (content?.content) return Buffer.from(content?.content.buffer);
    }

    return null;
  });
};
const createSearchContentHandler = <D extends object>(process: SearchIndexingProcessor<D>) => {
  return async (fastify: FastifyInstance, client: WeaviateClient, data: D) => {
    try {
      await process(
        {
          fastify,
          client
        },
        data
      );
    } catch (error) {
      fastify.log.error("Search Indexing Error:", error);
    }
  };
};

export {
  createSearchContentHandler,
  fragmentedContentProcessor,
  getContentBuffer,
  getContentBuffers,
  getParentContentGroup,
  getParentContentGroups,
  getContentGroupIds
};
export type { WhereOperand, SearchContentHandlerData };
