import { createPlugin } from "@vrite/backend";
import rateLimitPlugin from "@fastify/rate-limit";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { z } from "zod";
import sharp from "sharp";

const imageMimeTypes = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  tiff: "image/tiff"
};
const querystring = z.object({
  w: z.number().optional(),
  h: z.number().optional(),
  fit: z.enum(["cover", "contain", "fill"]).optional(),
  format: z.enum(["jpg", "jpeg", "png", "gif", "webp", "tiff"]).optional()
});
const assetsService = createPlugin(async (fastify) => {
  await fastify.register(rateLimitPlugin, {
    max: 1000,
    timeWindow: "1 minute",
    redis: fastify.redis
  });
  fastify.get<{
    Params: {
      workspaceId: string;
      assetId: string;
    };
    Querystring: {
      w?: string;
      h?: string;
      fit?: "cover" | "contain" | "fill";
      format?: keyof typeof imageMimeTypes;
    };
  }>("/:workspaceId/:assetId", async (req, reply) => {
    const command = new GetObjectCommand({
      Bucket: fastify.config.S3_BUCKET,
      Key: `${req.params.workspaceId}/${req.params.assetId}`
    });
    const sourceResponse = await fastify.s3.send(command);
    const sourceAsset = await sourceResponse.Body?.transformToByteArray();
    const sourceContentType = (sourceResponse.ContentType || "").toLowerCase();
    const sendSource = async (): Promise<void> => {
      await reply.header("Content-Type", sourceContentType).send(sourceAsset);
    };

    reply.header(
      "Access-Control-Allow-Origin",
      fastify.config.NODE_ENV === "development" ? "*" : fastify.config.PUBLIC_APP_URL
    );
    reply.header("Access-Control-Allow-Methods", "GET");

    if (!sourceAsset) return reply.status(404).send();

    if (!Object.values(imageMimeTypes).includes(sourceContentType)) {
      return sendSource();
    }

    try {
      const options = querystring.parse({
        w: req.query.w ? parseInt(req.query.w) : undefined,
        h: req.query.h ? parseInt(req.query.h) : undefined,
        fit: req.query.fit,
        format: req.query.format
      });

      if (!Object.keys(req.query).length) {
        return sendSource();
      }

      const transformer = sharp(sourceAsset, {
        animated: sourceContentType === imageMimeTypes.gif
      });

      if (options.w || options.h) {
        transformer.resize({
          width: options.w,
          height: options.h,
          fit: options.fit
        });
      }

      if (options.format) {
        transformer.toFormat(options.format);
      }

      return reply
        .header("Content-Type", options.format ? imageMimeTypes[options.format] : sourceContentType)
        .send(await transformer.toBuffer());
    } catch (e) {
      return sendSource();
    }
  });
});

export { assetsService };
