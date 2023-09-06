import { z } from "zod";
import ogs from "open-graph-scraper";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";
import mime from "mime-types";
import { extractPreviewDataFromOpenGraph } from "#lib/utils";
import { isAuthenticated } from "#lib/middleware";
import { procedure, router } from "#lib/trpc";
import * as errors from "#lib/errors";
import { hostConfig, HostConfig } from "#plugins/host-config";

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

const authenticatedProcedure = procedure.use(isAuthenticated);
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
    }),
  getUploadUrl: authenticatedProcedure
    .input(z.object({ contentType: z.string() }))
    .output(
      z.object({
        uploadUrl: z.string(),
        key: z.string()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const key = `${ctx.auth.workspaceId}/${nanoid()}.${mime.extension(input.contentType)}`;
      const uploadUrl = await getSignedUrl(
        ctx.fastify.s3,
        new PutObjectCommand({
          Bucket: ctx.fastify.config.S3_BUCKET,
          Key: key,
          ACL: "public-read",
          ContentType: input.contentType
        }),
        { expiresIn: 60 * 60 }
      );

      return { uploadUrl, key };
    }),
  getAnonymousUploadUrl: procedure
    .input(z.object({ contentType: z.string() }))
    .output(
      z.object({
        uploadUrl: z.string(),
        key: z.string()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const key = `vrite-editor/${nanoid()}.${mime.extension(input.contentType)}`;
      const uploadUrl = await getSignedUrl(
        ctx.fastify.s3,
        new PutObjectCommand({
          Bucket: ctx.fastify.config.S3_BUCKET,
          Key: key,
          ACL: "public-read",
          ContentType: input.contentType
        }),
        { expiresIn: 60 * 60 }
      );

      return { uploadUrl, key };
    })
});

export { utilsRouter };
export type { PreviewData, HostConfig };
