import { PreviewData } from "./handlers/open-graph";
import * as getHostConfig from "./handlers/host-config";
import * as getOpenGraph from "./handlers/open-graph";
import type { HostConfig } from "#lib/host-config";
import { procedure, router } from "#lib/trpc";

const utilsRouter = router({
  hostConfig: procedure.output(getHostConfig.outputSchema).query(({ ctx }) => {
    return getHostConfig.handler(ctx);
  }),
  openGraph: procedure
    .input(getOpenGraph.inputSchema)
    .output(getOpenGraph.outputSchema)
    .query(async ({ ctx, input }) => {
      return getOpenGraph.handler(ctx, input);
    })
});

export { utilsRouter };
export type { PreviewData, HostConfig };
