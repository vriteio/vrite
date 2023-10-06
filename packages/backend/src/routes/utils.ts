import { z } from "zod";
import ogs from "open-graph-scraper";
import {
  procedure,
  router,
  errors,
  extractPreviewDataFromOpenGraph,
  hostConfig,
  HostConfig
} from "#lib";

const previewData = z
  .object({
    image: z.string(),
    icon: z.string(),
    description: z.string(),
    title: z.string(),
    url: z.string()
  })
  .partial();

interface PreviewData extends z.infer<typeof previewData> {}

const utilsRouter = router({
  hostConfig: procedure.output(hostConfig).query(({ ctx }) => {
    return ctx.fastify.hostConfig;
  }),
  openGraph: procedure
    .input(z.object({ url: z.string() }))
    .output(previewData)
    .query(async ({ input }) => {
      try {
        const data = await ogs({
          url: input.url
        });

        if (data.error) throw errors.serverError();

        return {
          image: extractPreviewDataFromOpenGraph(data.result),
          icon: data.result.favicon || "",
          description: data.result.ogDescription || data.result.twitterDescription || "",
          title: data.result.ogTitle || data.result.twitterTitle || "",
          url: data.result.requestUrl
        };
      } catch (error) {
        throw errors.serverError();
      }
    })
});

export { utilsRouter };
export type { PreviewData, HostConfig };
