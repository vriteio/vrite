import weaviate, { ObjectsBatcher, WeaviateClient } from "weaviate-ts-client";
import {
  GenericJSONContentNode,
  JSONContentNode,
  JSONContentNodeWalker,
  createContentWalker,
  createOutputTransformer
} from "@vrite/sdk/transformers";
import { SearchService } from "fastify";
import { OpenAI } from "openai";
import { Stream } from "openai/streaming";
import { ChatCompletionChunk } from "openai/resources/chat";
import { Db, ObjectId, UnderscoreID, bufferToJSON, publicPlugin } from "#lib";
import { FullContentPiece, getContentVariantsCollection, getContentsCollection } from "#database";

interface RawSearchResult {
  data: {
    Get: {
      Content: Array<{
        content: string;
        breadcrumb: string[];
        contentPieceId: string;
        _additional: { id: string; score: number };
      }>;
    };
  };
}
interface WhereOperand {
  path: string[];
  operator: "Equal";
  valueText: string;
}

declare module "fastify" {
  interface SearchService {
    search(details: {
      query: string;
      workspaceId: ObjectId | string;
      contentPieceId?: ObjectId | string;
      variantId?: ObjectId | string;
      limit?: number;
    }): Promise<RawSearchResult>;
    ask(details: {
      question: string;
      workspaceId: ObjectId | string;
      variantId?: ObjectId | string;
    }): Promise<Stream<ChatCompletionChunk>>;
    bulkUpsertContent(
      details: Array<{
        contentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
        content?: Buffer;
        variantId?: string | ObjectId;
      }>
    ): Promise<void>;
    upsertContent(details: {
      contentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
      content?: Buffer;
      variantId?: string | ObjectId;
    }): Promise<void>;
    deleteContent(filter: {
      workspaceId: string | ObjectId;
      contentPieceId?: string | ObjectId | Array<string | ObjectId>;
      variantId?: string | ObjectId;
    }): Promise<void>;
    createTenant(workspaceId: ObjectId | string): Promise<void>;
    deleteTenant(workspaceId: ObjectId | string): Promise<void>;
  }
  interface FastifyInstance {
    search: SearchService;
  }
}

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
): Array<{ breadcrumb: string[]; content: string }> => {
  const walker = createContentWalker(content) as JSONContentNodeWalker<JSONContentNode["doc"]>;
  const sections: Array<{ breadcrumb: string[]; content: string }> = [];
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
            content: section
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
      // sections.push(paragraphsToSection([child.node]));
    }
  });

  if (paragraphs.length > 0) {
    const section = paragraphsToSection(paragraphs);

    if (section.length >= 2) {
      sections.push({
        breadcrumb: [...currentHeadings.values()].filter(Boolean),
        content: section
      });
    }
  }

  return sections;
};
const createSchema = async (client: WeaviateClient): Promise<void> => {
  try {
    await client.schema
      .classCreator()
      .withClass({
        class: "Content",
        multiTenancyConfig: { enabled: true },
        properties: [
          {
            name: "content",
            dataType: ["text"],
            indexFilterable: false
          },
          {
            name: "breadcrumb",
            dataType: ["text[]"],
            indexFilterable: false
          },
          {
            name: "contentPieceId",
            dataType: ["text"],
            moduleConfig: {
              "text2vec-openai": {
                skip: true
              }
            },
            indexSearchable: false
          },
          {
            name: "variantId",
            dataType: ["text"],
            moduleConfig: {
              "text2vec-openai": {
                skip: true
              }
            },
            indexSearchable: false
          }
        ]
      })
      .do();
  } catch (error) {
    // Ignore
  }
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
const searchPlugin = publicPlugin(async (fastify) => {
  const url = new URL(fastify.config.WEAVIATE_URL);
  const client = weaviate.client({
    scheme: url.protocol.replace(":", "") as "http" | "https",
    host: url.hostname,
    apiKey: new weaviate.ApiKey(fastify.config.WEAVIATE_API_KEY),
    headers: {
      "X-OpenAI-Api-Key": fastify.config.OPENAI_API_KEY
    }
  });
  const deleteContent: SearchService["deleteContent"] = async (details) => {
    const batchDeleter = client.batch
      .objectsBatchDeleter()
      .withClassName("Content")
      .withTenant(`${details.workspaceId}`);
    const operands: Array<WhereOperand | { operator: "And" | "Or"; operands: WhereOperand[] }> = [];

    if (details.contentPieceId) {
      let contentPieceIds: Array<string | ObjectId> = [];

      if (Array.isArray(details.contentPieceId)) {
        contentPieceIds = details.contentPieceId;
      } else {
        contentPieceIds = [details.contentPieceId];
      }

      contentPieceIds.forEach((contentPieceId) => {
        if (details.variantId) {
          operands.push({
            operator: "And",
            operands: [
              {
                path: ["contentPieceId"],
                operator: "Equal",
                valueText: `${contentPieceId}`
              },
              {
                path: ["variantId"],
                operator: "Equal",
                valueText: `${details.variantId}`
              }
            ]
          });
        } else {
          operands.push({
            path: ["contentPieceId"],
            operator: "Equal",
            valueText: `${contentPieceId}`
          });
        }
      });
    }

    if (details.variantId && !details.contentPieceId) {
      operands.push({
        path: ["variantId"],
        operator: "Equal",
        valueText: `${details.variantId}`
      });
    }

    if (!operands.length) return;

    await batchDeleter.withWhere({ operator: "Or", operands }).do();
  };
  const upsertContent = async (
    details: {
      contentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
      content?: Buffer;
      variantId?: string | ObjectId;
      batcher?: ObjectsBatcher;
    },
    upload?: boolean
  ): Promise<ObjectsBatcher> => {
    const contentBuffer =
      details.content ||
      (await getContentBuffer(fastify.mongo.db!, details.contentPiece._id, details.variantId));

    let batchCreator = details.batcher || client.batch.objectsBatcher();

    if (!contentBuffer) return batchCreator;

    const fragments = fragmentedContentProcessor(bufferToJSON(contentBuffer), details.contentPiece);

    if (!fragments.length) return batchCreator;

    fragments.forEach((fragment) => {
      batchCreator = batchCreator.withObject({
        class: "Content",
        tenant: `${details.contentPiece.workspaceId}`,
        properties: {
          content: fragment.content,
          breadcrumb: fragment.breadcrumb,
          contentPieceId: details.contentPiece._id,
          variantId: details.variantId || "base"
        }
      });
    });

    if (upload !== false) {
      await batchCreator.do();
    }

    return batchCreator;
  };

  await createSchema(client);
  fastify.decorate("search", {
    async createTenant(workspaceId: ObjectId) {
      await client.schema.tenantsCreator("Content", [{ name: `${workspaceId}` }]).do();
    },
    async deleteTenant(workspaceId: ObjectId) {
      await client.schema.tenantsDeleter("Content", [`${workspaceId}`]).do();
    },
    async search(details) {
      const getter = client.graphql
        .get()
        .withClassName("Content")
        .withTenant(`${details.workspaceId}`)
        .withHybrid({
          query: details.query,
          properties: ["breadcrumb^2", "content"],
          alpha: 0.4
        });
      const operands: Array<WhereOperand | { operator: "And" | "Or"; operands: WhereOperand[] }> =
        [];

      if (details.contentPieceId) {
        operands.push({
          operator: "And",
          operands: [
            {
              path: ["contentPieceId"],
              operator: "Equal",
              valueText: `${details.contentPieceId}`
            },
            {
              path: ["variantId"],
              operator: "Equal",
              valueText: `${details.variantId || "base"}`
            }
          ]
        });
      } else {
        operands.push({
          path: ["variantId"],
          operator: "Equal",
          valueText: `${details.variantId || "base"}`
        });
      }

      if (operands.length) {
        getter.withWhere({ operator: "Or", operands });
      }

      return await getter
        .withLimit(details.limit || 10)
        .withFields("content breadcrumb contentPieceId _additional { score id }")
        .do();
    },
    async ask(details) {
      const results = await this.search({
        query: details.question,
        workspaceId: details.workspaceId,
        variantId: details.variantId,
        limit: 8
      });
      const openai = new OpenAI({
        apiKey: fastify.config.OPENAI_API_KEY,
        organization: fastify.config.OPENAI_ORGANIZATION
      });

      return await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        stream: true,
        messages: [
          {
            role: "user",
            content: `Please answer the question according to the above context.

          ===
          Context: ${results.data.Get.Content.map(({ content, breadcrumb }) => {
            return `${breadcrumb?.join(" > ") || ""}:\n${content}`;
          }).join("\n\n")}
          ===
          Q: ${details.question}
          A:`
          }
        ]
      });
    },
    async upsertContent(details) {
      await deleteContent({
        workspaceId: details.contentPiece.workspaceId,
        contentPieceId: details.contentPiece._id,
        variantId: details.variantId
      });
      await upsertContent(details);
    },
    async bulkUpsertContent(details) {
      let batcher: ObjectsBatcher | null = null;

      for await (const { contentPiece, content, variantId } of details) {
        batcher = await upsertContent(
          { contentPiece, content, variantId, batcher: batcher || undefined },
          false
        );
      }

      if (batcher) await batcher?.do();
    },
    async deleteContent(details) {
      await deleteContent(details);
    }
  } as SearchService);
});

export { searchPlugin };
