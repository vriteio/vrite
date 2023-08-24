import { errors, publicPlugin, z } from "@vrite/backend";
import rateLimitPlugin from "@fastify/rate-limit";
import corsPlugin from "@fastify/cors";
import { GetObjectCommand } from "@aws-sdk/client-s3";
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
const assetsService = publicPlugin(async (fastify) => {
  await fastify.register(rateLimitPlugin, {
    max: 1000,
    timeWindow: "1 minute",
    redis: fastify.redis
  });
  await fastify.register(corsPlugin, {
    credentials: true,
    methods: ["GET", "DELETE", "PUT", "POST"],
    origin(origin, callback) {
      if (!origin || origin === "null") {
        callback(null, true);

        return;
      }

      const { hostname } = new URL(origin);

      if (
        hostname === "localhost" ||
        hostname.endsWith("vrite.io") ||
        hostname.endsWith("swagger.io")
      ) {
        //  Request from localhost will pass
        callback(null, true);

        return;
      }

      callback(new Error("Not allowed"), false);
    }
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
