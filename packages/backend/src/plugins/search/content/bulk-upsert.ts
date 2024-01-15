import {
  createSearchContentHandler,
  fragmentedContentProcessor,
  WhereOperand,
  getContentBuffers,
  getParentContentGroups,
  getContentGroupIds
} from "../utils";
import { ObjectId } from "mongodb";
import { FullContentGroup, FullContentPiece } from "#collections";
import { bufferToJSON } from "#lib/content-processing";
import { UnderscoreID } from "#lib/mongo";

const bulkUpsertContent = createSearchContentHandler<{
  entries: Array<{
    contentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
    contentGroup?: UnderscoreID<FullContentGroup<ObjectId>>;
    content?: Buffer;
    variantId?: string | ObjectId;
  }>;
  workspaceId: string | ObjectId;
}>(async ({ client, fastify }, details) => {
  // Delete old content
  const operands: Array<WhereOperand | { operator: "And" | "Or"; operands: WhereOperand[] }> = [];

  details.entries.forEach(({ contentPiece, contentGroup, variantId }) => {
    const andOperands: WhereOperand[] = [
      {
        path: ["contentPieceId"],
        operator: "Equal",
        valueText: `${contentPiece._id}`
      }
    ];

    if (variantId) {
      andOperands.push({
        path: ["variantId"],
        operator: "Equal",
        valueText: `${variantId}`
      });
    }

    if (contentGroup) {
      andOperands.push({
        path: ["contentGroupIds"],
        operator: "ContainsAny",
        valueTextArray: [`${contentGroup._id}`]
      });
    }

    operands.push({
      operator: "And",
      operands: andOperands
    });
  });
  await client.batch
    .objectsBatchDeleter()
    .withClassName("Content")
    .withTenant(`${details.workspaceId}`)
    .withWhere({ operator: "Or", operands })
    .do();

  // Insert new content
  let batchCreator = client.batch.objectsBatcher();

  const fetchedContentBuffers = await getContentBuffers(
    fastify.mongo.db!,
    details.entries
      .filter(({ content }) => !content)
      .map(({ contentPiece, variantId }) => ({
        contentPieceId: contentPiece._id,
        variantId
      }))
  );
  const contentBuffers = details.entries.map(({ content }) => {
    if (content) {
      return content;
    }

    return fetchedContentBuffers.shift();
  });
  const fetchedContentGroups = await getParentContentGroups(
    fastify,
    details.entries
      .filter(({ contentGroup }) => !contentGroup)
      .map(({ contentPiece }) => contentPiece)
  );
  const contentGroups = details.entries.map(({ contentGroup }) => {
    if (contentGroup) {
      return contentGroup;
    }

    return fetchedContentGroups.shift();
  });

  for (let i = 0; i < details.entries.length; i++) {
    const { contentPiece, variantId } = details.entries[i];
    const contentBuffer = contentBuffers[i];
    const contentGroup = contentGroups[i];

    if (!contentBuffer) continue;

    const fragments = fragmentedContentProcessor(bufferToJSON(contentBuffer), contentPiece);

    if (!fragments.length) return;

    fragments.forEach((fragment) => {
      batchCreator = batchCreator.withObject({
        class: "Content",
        tenant: `${contentPiece.workspaceId}`,
        properties: {
          type: fragment.type,
          content: fragment.content,
          breadcrumb: fragment.breadcrumb,
          contentGroupIds: getContentGroupIds(contentPiece, contentGroup),
          contentPieceId: contentPiece._id,
          variantId: variantId || "base"
        }
      });
    });
  }

  await batchCreator.do();
});

export { bulkUpsertContent };
