import * as getExtension from "./handlers/get";
import * as installExtension from "./handlers/install";
import * as uninstallExtension from "./handlers/uninstall";
import * as updateContentPieceData from "./handlers/update-content-piece-data";
import * as listExtensions from "./handlers/list";
import * as configureExtension from "./handlers/configure";
import { z } from "zod";
import { subscribeToExtensionEvents } from "#events/extension";
import { procedure, router } from "#lib/trpc";
import { isAuthenticated, isEnabled } from "#lib/middleware";

const authenticatedProcedure = procedure.use(isAuthenticated).use(isEnabled);
const basePath = "/extension";
const extensionsRouter = router({
  getExtension: procedure
    .meta({ openapi: { method: "GET", path: `${basePath}` }, requiredConfig: ["extensions"] })
    .input(z.void())
    .output(getExtension.outputSchema)
    .query(async ({ ctx }) => {
      return getExtension.handler(ctx);
    }),
  updateContentPieceData: authenticatedProcedure
    .meta({
      openapi: {
        method: "PUT",
        path: `${basePath}/content-piece-data`
      },
      requiredConfig: ["extensions"]
    })
    .input(updateContentPieceData.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return updateContentPieceData.handler(ctx, input);
    }),
  list: authenticatedProcedure
    .meta({
      requiredConfig: ["extensions"]
    })
    .input(listExtensions.inputSchema)
    .output(listExtensions.outputSchema)
    .query(async ({ ctx, input }) => {
      return listExtensions.handler(ctx, input);
    }),
  install: authenticatedProcedure
    .meta({
      permissions: { session: ["manageExtensions"] },
      requiredConfig: ["extensions"]
    })
    .input(installExtension.inputSchema)
    .output(installExtension.outputSchema)
    .mutation(async ({ ctx, input }) => {
      return installExtension.handler(ctx, input);
    }),
  configure: authenticatedProcedure
    .meta({
      permissions: { session: ["manageExtensions"] },
      requiredConfig: ["extensions"]
    })
    .input(configureExtension.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return configureExtension.handler(ctx, input);
    }),
  uninstall: authenticatedProcedure
    .meta({
      permissions: { session: ["manageExtensions"] },
      requiredConfig: ["extensions"]
    })
    .input(uninstallExtension.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return uninstallExtension.handler(ctx, input);
    }),
  changes: authenticatedProcedure.input(z.void()).subscription(({ ctx }) => {
    return subscribeToExtensionEvents(ctx, `${ctx.auth.workspaceId}`);
  })
});

export { extensionsRouter };
