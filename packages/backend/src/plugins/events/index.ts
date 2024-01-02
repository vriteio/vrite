import { contentPiece, workspaceSettings } from "#collections";
import { publishContentPieceEvent } from "#events";
import { createPlugin } from "#lib/plugin";
import {
  fetchContentPieceTags,
  fetchContentPieceMembers,
  getCanonicalLinkFromPattern
} from "#lib/utils";

const eventsPlugin = createPlugin(async (fastify) => {
  fastify.routeCallbacks.register("contentPieces.create", async (ctx, data) => {
    const tags = await fetchContentPieceTags(ctx.db, data.contentPiece);
    const members = await fetchContentPieceMembers(ctx.db, data.contentPiece);

    publishContentPieceEvent(ctx, `${data.contentPiece.contentGroupId}`, {
      action: "create",
      userId: `${ctx.auth.userId}`,
      data: {
        ...data.contentPiece,
        ...(typeof data.contentPiece.canonicalLink !== "string" && {
          canonicalLink: await getCanonicalLinkFromPattern(ctx, { slug: data.contentPiece.slug })
        }),
        id: `${data.contentPiece._id}`,
        workspaceId: `${data.contentPiece.workspaceId}`,
        date: data.contentPiece.date?.toISOString(),
        contentGroupId: `${data.contentPiece.contentGroupId}`,
        tags,
        members
      }
    });
  });
  fastify.routeCallbacks.register("contentPieces.delete", async (ctx, data) => {
    publishContentPieceEvent(ctx, `${data.contentPiece.contentGroupId}`, {
      action: "delete",
      userId: `${ctx.auth.userId}`,
      data: { id: `${data.contentPiece._id}` }
    });
  });
  fastify.routeCallbacks.register("contentPieces.move", async (ctx, data) => {
    const tags = await fetchContentPieceTags(ctx.db, data.updatedContentPiece);
    const members = await fetchContentPieceMembers(ctx.db, data.updatedContentPiece);
    const sameContentGroup = data.contentPiece.contentGroupId.equals(
      data.updatedContentPiece.contentGroupId
    );

    publishContentPieceEvent(
      ctx,
      [
        `${data.contentPiece.contentGroupId}`,
        ...(sameContentGroup ? [] : [`${data.updatedContentPiece.contentGroupId}`])
      ],
      {
        action: "move",
        userId: `${ctx.auth.userId}`,
        data: {
          contentPiece: {
            ...data.updatedContentPiece,
            ...(typeof data.updatedContentPiece.canonicalLink !== "string" && {
              canonicalLink: await getCanonicalLinkFromPattern(ctx, {
                slug: data.updatedContentPiece.slug
              })
            }),
            id: `${data.updatedContentPiece._id}`,
            contentGroupId: `${data.updatedContentPiece.contentGroupId}`,
            workspaceId: `${data.updatedContentPiece.workspaceId}`,
            date: data.updatedContentPiece.date?.toISOString(),
            tags,
            members
          },
          nextReferenceId: `${data.nextReferenceId || ""}`,
          previousReferenceId: `${data.previousReferenceId || ""}`
        }
      }
    );
  });
  fastify.routeCallbacks.register("contentPieces.update", async (ctx, data) => {
    const tags = await fetchContentPieceTags(ctx.db, data.updatedContentPiece);
    const members = await fetchContentPieceMembers(ctx.db, data.updatedContentPiece);

    publishContentPieceEvent(ctx, `${data.updatedContentPiece.contentGroupId}`, {
      action: "update",
      userId: `${ctx.auth.userId}`,
      data: {
        ...data.updatedContentPiece,
        ...(typeof data.updatedContentPiece.canonicalLink !== "string" && {
          canonicalLink: await getCanonicalLinkFromPattern(ctx, {
            slug: data.updatedContentPiece.slug,
            variant: data.variantKey
          })
        }),
        id: `${data.updatedContentPiece._id}`,
        contentGroupId: `${data.updatedContentPiece.contentGroupId}`,
        workspaceId: `${data.updatedContentPiece.workspaceId}`,
        date: data.updatedContentPiece.date?.toISOString() || null,
        tags,
        members,
        ...(data.variantId ? { variantId: data.variantId } : {})
      }
    });
  });
});

export { eventsPlugin };
