import { handleContentPieceCreated } from "./handlers/content-piece-created";
import { handleContentPieceRemoved } from "./handlers/content-piece-removed";
import { handleContentPieceMoved } from "./handlers/content-piece-moved";
import { handleContentPieceUpdated } from "./handlers/content-piece-updated";
import { handleContentGroupCreated } from "./handlers/content-group-created";
import { handleContentGroupRemoved } from "./handlers/content-group-removed";
import { handleContentGroupMoved } from "./handlers/content-group-moved";
import { handleContentGroupUpdated } from "./handlers/content-group-updated";
import { createPlugin } from "#lib/plugin";

/*  let { variantsDirectory } = gitData.github!;

  if (variantsDirectory.startsWith("/")) variantsDirectory = variantsDirectory.slice(1);

  const variantsPathRegex = new RegExp(`^${variantsDirectory}/(.+?)(?=/|$)`); */
const gitSyncPlugin = createPlugin(async (fastify) => {
  fastify.routeCallbacks.register("contentPieces.create", (ctx, data) => {
    handleContentPieceCreated(ctx, {
      contentPiece: data.contentPiece,
      contentBuffer: data.contentBuffer
    });
  });
  fastify.routeCallbacks.register("contentPieces.delete", (ctx, data) => {
    handleContentPieceRemoved(ctx, { contentPiece: data.contentPiece });
  });
  fastify.routeCallbacks.register("contentPieces.move", (ctx, data) => {
    handleContentPieceMoved(ctx, {
      contentPiece: data.updatedContentPiece,
      contentGroupId: `${data.updatedContentPiece.contentGroupId}`
    });
  });
  fastify.routeCallbacks.register("contentPieces.update", (ctx, data) => {
    handleContentPieceUpdated(ctx, {
      contentPiece: data.updatedContentPiece,
      variantId: data.variantId
    });
  });
  fastify.routeCallbacks.register("contentGroups.create", (ctx, data) => {
    handleContentGroupCreated(ctx, {
      contentGroup: data.contentGroup
    });
  });
  fastify.routeCallbacks.register("contentGroups.delete", (ctx, data) => {
    handleContentGroupRemoved(ctx, { contentGroup: data.contentGroup });
  });
  fastify.routeCallbacks.register("contentGroups.move", (ctx, data) => {
    handleContentGroupMoved(ctx, {
      ancestor: `${data.updatedContentGroup.ancestors.at(-1) || ""}` || null,
      contentGroup: data.updatedContentGroup
    });
  });
  fastify.routeCallbacks.register("contentGroups.update", (ctx, data) => {
    const newAncestor = data.updatedContentGroup.ancestors.at(-1);
    const newName = data.updatedContentGroup.name;
    const ancestorUpdated = newAncestor !== data.contentGroup.ancestors.at(-1);
    const nameUpdated = newName !== data.contentGroup.name;

    handleContentGroupUpdated(ctx, {
      contentGroup: data.contentGroup,
      ancestor: ancestorUpdated ? `${newAncestor || ""}` || undefined : undefined,
      name: nameUpdated ? newName : undefined
    });
  });
  fastify.routeCallbacks.register("variants.delete", () => {
    // TODO: handle variant deletion
  });
});

export { gitSyncPlugin };
