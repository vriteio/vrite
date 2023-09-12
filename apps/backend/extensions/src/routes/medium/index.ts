import { mediumOutputTransformer } from "./transformer";
import { procedure, router, zodId, z, errors } from "@vrite/backend";
import {
  JSONContent,
  createClient,
  ContentPieceWithAdditionalData,
  Extension
} from "@vrite/sdk/api";

const processContent = (content: JSONContent): string => {
  return mediumOutputTransformer(content);
};
const basePath = "/medium";
const getAuthorId = async (token: string): Promise<string> => {
  const contentType = "application/json";

  try {
    const response = await fetch("https://api.medium.com/v1/me", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": contentType,
        "content-type": contentType
      }
    });
    const json: { data?: { id: string } } = await response.json();

    if (!json.data?.id) throw errors.serverError();

    return json.data?.id || "";
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    throw errors.serverError();
  }
};
const publishToMedium = async (
  contentPiece: ContentPieceWithAdditionalData<Record<string, any>, true>,
  extension: Partial<Extension>
): Promise<{ mediumId: string }> => {
  const contentType = "application/json";
  const contentPieceData = contentPiece.customData?.__extensions__?.[extension.name || ""] || {};
  const article = {
    title: contentPiece.title,
    content: [
      `# ${contentPiece.title}`,
      contentPiece.coverUrl && `![${contentPiece.coverAlt || ""}](${contentPiece.coverUrl || ""})`,
      `${processContent(contentPiece.content)}`
    ]
      .filter(Boolean)
      .join("\n"),
    contentFormat: "markdown",
    tags: contentPiece.tags
      .map((tag) => tag.label?.toLowerCase().replace(/\s/g, ""))
      .filter(Boolean),
    canonicalUrl: contentPiece.canonicalLink || undefined,
    publishStatus: "public"
  };

  if (!extension.config) throw errors.notFound("extension");

  if (typeof contentPieceData?.draft === "boolean") {
    article.publishStatus = contentPieceData.draft ? "draft" : "public";
  } else if (typeof extension.config.draft === "boolean") {
    article.publishStatus = extension.config.draft ? "draft" : "public";
  }

  try {
    const authorId = await getAuthorId(`${extension.config.token}`);
    const response = await fetch(`https://api.medium.com/v1/users/${authorId}/posts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${extension.config.token}`,
        "Accept": contentType,
        "content-type": contentType
      },
      body: JSON.stringify(article)
    });
    const json: { data?: { id: string } } = await response.json();

    if (!json.data?.id) throw errors.serverError();

    return { mediumId: `${json.data?.id || ""}` };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    throw errors.serverError();
  }
};
const mediumRouter = router({
  publish: procedure
    .meta({
      openapi: { method: "POST", path: `${basePath}` }
    })
    .input(
      z.object({
        contentPieceId: zodId()
      })
    )
    .output(z.object({ mediumId: z.string() }))
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

      return await publishToMedium(contentPiece, extension);
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
      if (contentPieceData.mediumId) return;
      if (extension.config?.requireCanonicalLink && !contentPiece.canonicalLink) return;

      const { mediumId } = await publishToMedium(contentPiece, extension);

      await client.extension.updateContentPieceData({
        contentPieceId: input.id,
        data: { ...contentPiece.customData?.__extensions__?.[extension.name || ""], mediumId }
      });
    })
});

export { mediumRouter };
