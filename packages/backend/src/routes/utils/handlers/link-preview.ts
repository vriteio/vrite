import { z } from "zod";
import ogs from "open-graph-scraper";
import { OgObject } from "open-graph-scraper/dist/lib/types";
import { ObjectId } from "mongodb";
import { convert as convertToText } from "html-to-text";
import { errors } from "#lib/errors";
import { Context } from "#lib/context";
import {
  getContentPieceVariantsCollection,
  getContentPiecesCollection,
  getGitDataCollection
} from "#collections";
import { zodId } from "#lib/mongo";

const extractPreviewDataFromOpenGraph = (input: OgObject): string => {
  if (input.ogImage) {
    if (typeof input.ogImage === "string") {
      return input.ogImage;
    }

    if (Array.isArray(input.ogImage)) {
      return input.ogImage[0].url;
    }

    return (input.ogImage as any).url;
  }

  if (input.twitterImage && typeof input.twitterImage === "string") {
    return input.twitterImage;
  }

  return "";
};
const previewData = z
  .object({
    image: z.string().describe("Preview image for the URL"),
    icon: z.string().describe("Favicon for the URL"),
    description: z.string().describe("Description of the URL"),
    title: z.string().describe("Title of the URL"),
    url: z.string().describe("URL of the preview"),
    type: z.enum(["internal", "external"]).describe("Type of the URL")
  })
  .partial();

interface PreviewData extends z.infer<typeof previewData> {}

const inputSchema = z.object({
  url: z.string().describe("URL to fetch preview data for"),
  variantId: zodId()
    .optional()
    .describe("ID of the variant in which to look for internal link data"),
  workspaceId: zodId()
    .optional()
    .describe("ID of the workspace in which to look for internal link data")
});
const outputSchema = previewData;
const handler = async (
  ctx: Context,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const urlFragments = input.url.split(".")[0].split("/").filter(Boolean);

  if (input.url.startsWith("/")) {
    if (!input.workspaceId) throw errors.serverError();

    // Internal link
    const contentPiecesCollection = getContentPiecesCollection(ctx.db);
    const contentPieceVariantsCollection = getContentPieceVariantsCollection(ctx.db);
    const gitDataCollection = getGitDataCollection(ctx.db);

    let contentPieceId: ObjectId | null = null;

    if (ObjectId.isValid(urlFragments[0])) {
      contentPieceId = new ObjectId(urlFragments[0]);
    } else {
      const gitData = await gitDataCollection.findOne({
        workspaceId: new ObjectId(input.workspaceId)
      });
      const record = gitData?.records.find(
        (record) => record.path.split(".")[0] === urlFragments.join("/")
      );

      if (record) {
        contentPieceId = new ObjectId(record.contentPieceId);
      }
    }

    if (!contentPieceId) throw errors.serverError();

    const baseContentPiece = await contentPiecesCollection.findOne({
      _id: contentPieceId
    });

    if (!baseContentPiece) throw errors.serverError();

    let contentPiece = baseContentPiece;

    if (input.variantId) {
      const contentPieceVariant = await contentPieceVariantsCollection.findOne({
        contentPieceId,
        variantId: new ObjectId(input.variantId)
      });

      if (contentPieceVariant) {
        contentPiece = {
          ...baseContentPiece,
          ...contentPieceVariant
        };
      }
    }

    return {
      image: contentPiece.coverUrl || "",
      icon: "",
      description: convertToText(contentPiece.description || ""),
      title: contentPiece.title || "",
      url: input.url,
      type: "internal"
    };
  }

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
      url: data.result.requestUrl,
      type: "external"
    };
  } catch (error) {
    throw errors.serverError();
  }
};

export { inputSchema, outputSchema, handler };
export type { PreviewData };
