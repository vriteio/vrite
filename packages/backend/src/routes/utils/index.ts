import { PreviewData } from "./handlers/link-preview";
import * as getHostConfig from "./handlers/host-config";
import * as getLinkPreview from "./handlers/link-preview";
import * as generateCSS from "./handlers/generate-css";
import * as autocomplete from "./handlers/autocomplete";
import type { HostConfig } from "#lib/host-config";
import { procedure, router } from "#lib/trpc";
import { isAuthenticated } from "#lib/middleware";

const authenticatedProcedure = procedure.use(isAuthenticated);
const utilsRouter = router({
  hostConfig: procedure.output(getHostConfig.outputSchema).query(({ ctx }) => {
    return getHostConfig.handler(ctx);
  }),
  linkPreview: procedure
    .input(getLinkPreview.inputSchema)
    .output(getLinkPreview.outputSchema)
    .query(async ({ ctx, input }) => {
      return getLinkPreview.handler(ctx, input);
    }),
  generateCSS: authenticatedProcedure
    .input(generateCSS.inputSchema)
    .output(generateCSS.outputSchema)
    .mutation(async ({ ctx, input }) => {
      return generateCSS.handler(ctx, input);
    }),
  autocomplete: authenticatedProcedure
    .input(autocomplete.inputSchema)
    .output(autocomplete.outputSchema)
    .query(async ({ ctx, input }) => {
      return autocomplete.handler(ctx, input);
    })
});

export { utilsRouter };
export type { PreviewData, HostConfig };
