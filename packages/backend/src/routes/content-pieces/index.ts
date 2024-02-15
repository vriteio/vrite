import * as listContentPieces from "./handlers/list";
import * as getContentPiece from "./handlers/get";
import * as createContentPiece from "./handlers/create";
import * as moveContentPiece from "./handlers/move";
import * as deleteContentPiece from "./handlers/delete";
import * as updateContentPiece from "./handlers/update";
import { z } from "zod";
import { subscribeToContentPieceEvents } from "#events";
import { isAuthenticated } from "#lib/middleware";
import { zodId } from "#lib/mongo";
import { procedure, router } from "#lib/trpc";

const basePath = "/content-pieces";
const authenticatedProcedure = procedure.use(isAuthenticated);
const contentPiecesRouter = router({
  get: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: basePath, protect: true },
      permissions: { token: ["contentPieces:read"] }
    })
    .input(getContentPiece.inputSchema)
    .output(getContentPiece.outputSchema)
    .query(async ({ ctx, input }) => {
      return getContentPiece.handler(ctx, input);
    }),
  list: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: `${basePath}/list`, protect: true },
      permissions: { token: ["contentPieces:read"] }
    })
    .input(listContentPieces.inputSchema)
    .output(listContentPieces.outputSchema)
    .query(async ({ ctx, input }) => {
      return listContentPieces.handler(ctx, input);
    }),
  create: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: basePath, protect: true },
      permissions: { session: ["manageDashboard"], token: ["contentPieces:write"] },
      requiredSubscriptionPlan: "personal"
    })
    .input(createContentPiece.inputSchema)
    .output(createContentPiece.outputSchema)
    .mutation(async ({ ctx, input }) => {
      return createContentPiece.handler(ctx, input);
    }),
  update: authenticatedProcedure
    .meta({
      openapi: { method: "PUT", path: basePath, protect: true },
      permissions: { session: ["editMetadata", "manageDashboard"], token: ["contentPieces:write"] },
      requiredSubscriptionPlan: "personal"
    })
    .input(updateContentPiece.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return updateContentPiece.handler(ctx, input);
    }),
  delete: authenticatedProcedure
    .meta({
      openapi: { method: "DELETE", path: basePath, protect: true },
      permissions: { session: ["manageDashboard"], token: ["contentPieces:read"] }
    })
    .input(deleteContentPiece.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return deleteContentPiece.handler(ctx, input);
    }),
  move: authenticatedProcedure
    .meta({
      permissions: { session: ["manageDashboard"] },
      requiredSubscriptionPlan: "personal"
    })
    .input(moveContentPiece.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return moveContentPiece.handler(ctx, input);
    }),
  changes: authenticatedProcedure
    .input(z.object({ contentGroupId: zodId() }))
    .subscription(async ({ ctx, input }) => {
      return subscribeToContentPieceEvents(ctx, input.contentGroupId);
    })
});

export { contentPiecesRouter };
