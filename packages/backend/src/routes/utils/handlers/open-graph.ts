import { z } from "zod";
import ogs from "open-graph-scraper";
import { errors } from "#lib/errors";
import { extractPreviewDataFromOpenGraph } from "#lib/utils";
import { Context } from "#lib/context";

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

const inputSchema = z.object({ url: z.string() });
const outputSchema = previewData;
const handler = async (
  _ctx: Context,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
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
};

export { inputSchema, outputSchema, handler };
export type { PreviewData };
