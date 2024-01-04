import { hashnodeOutputTransformer } from "./transformer";
import { procedure, router, zodId, errors } from "@vrite/backend";
import {
  JSONContent,
  createClient,
  ContentPieceWithAdditionalData,
  Extension
} from "@vrite/sdk/api";
import { z } from "zod";

const processContent = (content: JSONContent): string => {
  return hashnodeOutputTransformer(content);
};
const basePath = "/hashnode";
const publishToHashnode = async (
  contentPiece: ContentPieceWithAdditionalData<Record<string, any>, true>,
  extension: Partial<Extension>
): Promise<{ hashnodeId: string }> => {
  const contentType = "application/json";
  const contentPieceData = contentPiece.customData?.__extensions__?.[extension.name || ""] || {};

  if (!extension.config) throw errors.notFound("extension");

  const articleInput = {
    title: contentPiece.title,
    slug: contentPiece.slug,
    contentMarkdown: processContent(contentPiece.content),
    tags: contentPiece.tags.map((tag) => ({
      slug: (tag.label || "").toLowerCase(),
      name: (tag.label || "").toLowerCase(),
      _id: ""
    })),
    isPartOfPublication: {
      publicationId: extension.config!.publicationId
    },
    ...(contentPiece.coverUrl && { coverImageURL: contentPiece.coverUrl }),
    ...(contentPiece.canonicalLink && {
      isRepublished: {
        originalArticleURL: contentPiece.canonicalLink
      }
    })
  };

  if (contentPieceData?.hashnodeId) {
    try {
      const response = await fetch("https://api.hashnode.com/", {
        method: "POST",
        headers: {
          "Authorization": `${extension.config.accessToken}`,
          "Accept": contentType,
          "content-type": contentType,
          "User-Agent": "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; .NET CLR 1.1.4322)"
        },
        body: JSON.stringify({
          query: `mutation ($postId:String!, $input: UpdateStoryInput!) {
            updateStory(postId:$postId, input: $input) {
              success
              post {
                _id
              }
            }
          }`,
          variables: {
            postId: contentPieceData.hashnodeId,
            input: articleInput
          }
        })
      });
      const json: {
        errors?: Array<{
          message: string;
          extensions: Record<string, string>;
          locations: Array<{ line: number; column: number }>;
        }>;
        data?: {
          updateStory: {
            success: boolean;
            post: { _id: string };
          };
        };
      } = await response.json();

      if (json.errors) {
        // eslint-disable-next-line no-console
        console.error(json.errors);
        throw errors.serverError();
      }

      return { hashnodeId: `${json.data?.updateStory.post._id || ""}` };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      throw errors.serverError();
    }
  } else {
    try {
      const response = await fetch("https://api.hashnode.com/", {
        method: "POST",
        headers: {
          "Authorization": `${extension.config.accessToken}`,
          "Accept": contentType,
          "content-type": contentType,
          "User-Agent": "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; .NET CLR 1.1.4322)"
        },
        body: JSON.stringify({
          query: `mutation ($input: CreateStoryInput!) {
            createStory(input: $input) {
              success
              post {
                _id
              }
            }
          }`,
          variables: { input: articleInput }
        })
      });
      const json: {
        errors?: Array<{
          message: string;
          extensions: Record<string, string>;
          locations: Array<{ line: number; column: number }>;
        }>;
        data?: {
          createStory: {
            success: boolean;
            post: { _id: string };
          };
        };
      } = await response.json();

      if (json.errors) {
        // eslint-disable-next-line no-console
        console.error(json.errors);
        throw errors.serverError();
      }

      return { hashnodeId: `${json.data?.createStory.post._id || ""}` };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      throw errors.serverError();
    }
  }
};
const hashnodeRouter = router({
  publish: procedure
    .meta({
      openapi: { method: "POST", path: `${basePath}` }
    })
    .input(
      z.object({
        contentPieceId: zodId()
      })
    )
    .output(z.object({ hashnodeId: z.string() }))
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

      return await publishToHashnode(contentPiece, extension);
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

      const { hashnodeId } = await publishToHashnode(contentPiece, extension);

      await client.extension.updateContentPieceData({
        contentPieceId: input.id,
        data: { ...contentPiece.customData?.__extensions__?.[extension.name || ""], hashnodeId }
      });
    })
});

export { hashnodeRouter };
