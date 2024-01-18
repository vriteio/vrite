import { PreviewData } from "./handlers/link-preview";
import * as getHostConfig from "./handlers/host-config";
import * as getLinkPreview from "./handlers/link-preview";
import type { HostConfig } from "#lib/host-config";
import { procedure, router } from "#lib/trpc";

const utilsRouter = router({
  hostConfig: procedure.output(getHostConfig.outputSchema).query(({ ctx }) => {
    return getHostConfig.handler(ctx);
  }),
  linkPreview: procedure
    .input(getLinkPreview.inputSchema)
    .output(getLinkPreview.outputSchema)
    .query(async ({ ctx, input }) => {
      return getLinkPreview.handler(ctx, input);
    })
});

export { utilsRouter };
export type { PreviewData, HostConfig };
