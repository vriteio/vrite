/* eslint-disable camelcase */
import { procedure, router, zodId, z, errors } from "@vrite/backend";
import {
  JSONContent,
  createClient,
  ContentPieceWithAdditionalData,
  Extension,
  JSONContentAttrs
} from "@vrite/sdk/api";
import { createContentTransformer, gfmTransformer } from "@vrite/sdk/transformers";

const processContent = (content: JSONContent): string => {
  const matchers = {
    youtube:
      /^ *https?:\/\/(?:www\.)?youtu\.?be(?:.com)?\/(?:watch\?v=|embed\/)?(.+?)(?:[ &/?].*)*$/i,
    codepen: /^ *https?:\/\/(?:www\.)?codepen\.io\/.+?\/(?:embed|pen)?\/(.+?)(?:[ &/?].*)*$/i,
    codesandbox: /^ *https?:\/\/(?:www\.)?codesandbox\.io\/(?:s|embed)\/(.+?)(?:[ &/?].*)*$/i
  };
  const getEmbedId = (value: string, embedType: keyof typeof matchers): string => {
    const matcher = matchers[embedType];
    const match = matcher.exec(value);

    if (match) {
      return match[1];
    }

    return value;
  };
  const transformEmbed = (attrs: JSONContentAttrs) => {
    switch (attrs.embed) {
      case "codepen":
        return `\n%[https://codepen.io/codepen/embed/${getEmbedId(`${attrs.src}`, "codepen")}]\n`;
      case "codesandbox":
        return `\n%[https://codesandbox.io/s/${getEmbedId(`${attrs.src}`, "codesandbox")}]\n`;
      case "youtube":
        return `\n%[https://www.youtube.com/watch?v=${getEmbedId(`${attrs.src}`, "youtube")}]\n`;
      default:
        return "";
    }
  };
  const hashnodeTransformer = createContentTransformer({
    applyInlineFormatting(type, attrs, content) {
      if (type === "strike") {
        return `<s>${content}</s>`;
      }

      if (type === "highlight") {
        return `<mark>${content}</mark>`;
      }

      return gfmTransformer({
        type,
        attrs,
        content: [
          {
            type: "text",
            marks: [{ type, attrs }],
            text: content
          }
        ]
      });
    },
    transformNode(type, attrs, content) {
      switch (type) {
        case "embed":
          return transformEmbed(attrs);
        case "taskList":
          return "";
        default:
          return gfmTransformer({
            type,
            attrs,
            content: [
              {
                type: "text",
                attrs: {},
                text: content
              }
            ]
          });
      }
    }
  });

  return hashnodeTransformer(content);
};
const basePath = "/hashnode";
const publishToHashnode = async (
  contentPiece: ContentPieceWithAdditionalData<Record<string, any>, true>,
  extension: Partial<Extension>
) => {
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
        console.error(json.errors);
        throw errors.serverError();
      }

      return { hashnodeId: `${json.data?.updateStory.post._id || ""}` };
    } catch (error) {
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
        console.error(json.errors);
        throw errors.serverError();
      }

      return { hashnodeId: `${json.data?.createStory.post._id || ""}` };
    } catch (error) {
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

      await client.contentPieces.update({
        id: input.id,
        customData: {
          ...contentPiece.customData,
          __extensions__: {
            ...(contentPiece.customData?.__extensions__ || {}),
            [extension.name || ""]: {
              ...contentPiece.customData?.__extensions__?.[extension.name || ""],
              hashnodeId
            }
          }
        }
      });
    })
});

export { hashnodeRouter };
