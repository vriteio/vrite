import { devOutputTransformer } from "./transformer";
import { procedure, router, zodId, errors } from "@vrite/backend";
import {
  JSONContent,
  createClient,
  ContentPieceWithAdditionalData,
  Extension
} from "@vrite/sdk/api";
import { z } from "zod";

const processContent = (content: JSONContent): string => {
  return devOutputTransformer(content);
};
const basePath = "/dev";
const publishToDEV = async (
  contentPiece: ContentPieceWithAdditionalData<Record<string, any>, true>,
  extension: Partial<Extension>
): Promise<{ devId: string }> => {
  const contentType = "application/json";
  const contentPieceData = contentPiece.customData?.__extensions__?.[extension.name || ""] || {};
  const article = {
    title: contentPiece.title,
    body_markdown: processContent(contentPiece.content),
    description: contentPiece.description || undefined,
    tags: contentPiece.tags
      .map((tag) => tag.label?.toLowerCase().replace(/\s/g, ""))
      .filter(Boolean),
    canonical_url: contentPiece.canonicalLink || undefined,
    published: true,
    series: contentPieceData?.devSeries || undefined,
    main_image: contentPiece.coverUrl || undefined
  };

  if (!extension.config) throw errors.notFound("extension");

  if (typeof contentPieceData?.draft === "boolean") {
    article.published = !contentPieceData.draft;
  } else if (typeof extension.config.draft === "boolean") {
    article.published = !extension.config.draft;
  }

  if (contentPieceData?.devId) {
    try {
      const response = await fetch(`https://dev.to/api/articles/${contentPieceData.devId}`, {
        method: "PUT",
        headers: {
          "api-key": `${extension.config.apiKey}`,
          "Accept": "application/vnd.forem.api-v1+json",
          "content-type": contentType
        },
        body: JSON.stringify({
          article
        })
      });
      const data: { error?: string; id?: string } = await response.json();

      if (data.error) {
        // eslint-disable-next-line no-console
        console.error(data.error);
        throw errors.serverError();
      }

      return { devId: `${data.id || ""}` };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      throw errors.serverError();
    }
  } else {
    try {
      const response = await fetch(`https://dev.to/api/articles`, {
        method: "POST",
        body: JSON.stringify({ article }),
        headers: {
          "api-key": `${extension.config.apiKey}`,
          "Accept": "application/vnd.forem.api-v1+json",
          "content-type": contentType
        }
      });
      const data: { error?: string; id?: string } = await response.json();

      if (data.error) {
        // eslint-disable-next-line no-console
        console.error(data.error);
        throw errors.serverError();
      }

      return { devId: `${data.id || ""}` };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      throw errors.serverError();
    }
  }
};
const devRouter = router({
  publish: procedure
    .meta({
      openapi: { method: "POST", path: `${basePath}` }
    })
    .input(
      z.object({
        contentPieceId: zodId()
      })
    )
    .output(z.object({ devId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const token = ctx.req.headers.authorization?.replace("Bearer ", "");
      const extensionId = ctx.req.headers["x-vrite-extension-id"] as string | undefined;

      if (!token || !extensionId) throw errors.unauthorized();

      const client = createClient({
        token,
        extensionId
      });
      const extension = await client.extension.get();
      const contentPiece = await client.contentPieces.get({
        id: input.contentPieceId,
        content: true,
        description: "text"
      });

      return await publishToDEV(contentPiece, extension);
    }),
  webhook: procedure
    .meta({ openapi: { method: "POST", path: `${basePath}/webhook` } })
    .input(
      z.object({
        id: zodId()
      })
    )
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const extensionId = ctx.req.headers["x-vrite-extension-id"] as string | undefined;

      if (!extensionId) throw errors.unauthorized();

      const client = createClient({
        token: "",
        extensionId
      });
      const extension = await client.extension.get();

      if (!extension.token) throw errors.unauthorized();

      client.reconfigure({ token: extension.token });

      const contentPiece = await client.contentPieces.get({
        id: input.id,
        content: true,
        description: "text"
      });
      const contentPieceData =
        contentPiece.customData?.__extensions__?.[extension.name || ""] || {};

      if (contentPieceData.autoPublish === false) return;
      if (extension.config?.requireCanonicalLink && !contentPiece.canonicalLink) return;

      const { devId } = await publishToDEV(contentPiece, extension);

      await client.extension.updateContentPieceData({
        contentPieceId: input.id,
        data: { ...contentPiece.customData?.__extensions__?.[extension.name || ""], devId }
      });
    })
});

export { devRouter };
