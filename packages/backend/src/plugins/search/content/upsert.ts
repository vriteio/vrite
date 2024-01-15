import { deleteContent } from "./delete";
import {
  createSearchContentHandler,
  fragmentedContentProcessor,
  getContentBuffer,
  getContentGroupIds,
  getParentContentGroup
} from "../utils";
import { ObjectId } from "mongodb";
import { FullContentGroup, FullContentPiece } from "#collections";
import { bufferToJSON } from "#lib/content-processing";
import { UnderscoreID } from "#lib/mongo";

const upsertContent = createSearchContentHandler<{
  contentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
  contentGroup?: UnderscoreID<FullContentGroup<ObjectId>>;
  content?: Buffer;
  variantId?: string | ObjectId;
  workspaceId: string | ObjectId;
}>(async ({ client, fastify }, details) => {
  await deleteContent(fastify, client, {
    workspaceId: details.workspaceId,
    contentPieceId: details.contentPiece._id,
    variantId: details.variantId
  });

  const contentBuffer =
    details.content ||
    (await getContentBuffer(fastify.mongo.db!, details.contentPiece._id, details.variantId));
  const contentGroup =
    details.contentGroup || (await getParentContentGroup(fastify, details.contentPiece));
  const contentGroupIds = getContentGroupIds(details.contentPiece, contentGroup);

  let batchCreator = client.batch.objectsBatcher();

  if (!contentBuffer) return;

  const fragments = fragmentedContentProcessor(bufferToJSON(contentBuffer), details.contentPiece);

  if (!fragments.length) return;

  fragments.forEach((fragment) => {
    batchCreator = batchCreator.withObject({
      class: "Content",
      tenant: `${details.contentPiece.workspaceId}`,
      properties: {
        type: fragment.type,
        content: fragment.content,
        breadcrumb: fragment.breadcrumb,
        contentPieceId: details.contentPiece._id,
        variantId: details.variantId || "base",
        contentGroupIds
      }
    });
  });
  await batchCreator.do();
});

export { upsertContent };
