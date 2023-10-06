import { errors, publicPlugin, trpcPlugin, processAuth } from "@vrite/backend";
import staticPlugin from "@fastify/static";
import websocketPlugin from "@fastify/websocket";
import axios from "axios";
import viewPlugin from "@fastify/view";
import handlebars from "handlebars";
import { FastifyReply } from "fastify";
import { nanoid } from "nanoid";
import multipartPlugin from "@fastify/multipart";
import mime from "mime-types";
import sharp from "sharp";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import path from "path";

const appService = publicPlugin(async (fastify) => {
  const renderPage = async (reply: FastifyReply): Promise<void> => {
    return reply.header("X-Frame-Options", "SAMEORIGIN").view("index.html", {
      PUBLIC_APP_URL: fastify.config.PUBLIC_APP_URL,
      PUBLIC_API_URL: fastify.config.PUBLIC_API_URL,
      PUBLIC_COLLAB_URL: fastify.config.PUBLIC_COLLAB_URL,
      PUBLIC_ASSETS_URL: fastify.config.PUBLIC_ASSETS_URL,
      PUBLIC_DISABLE_ANALYTICS: fastify.config.PUBLIC_DISABLE_ANALYTICS,
      PUBLIC_APP_TYPE: fastify.config.PUBLIC_APP_TYPE
    });
  };

  await fastify.register(multipartPlugin, {
    limits: {
      fileSize: 10 * 1024 * 1024
    }
  });
  await fastify.register(staticPlugin, {
    root: path.join(__dirname, "public"),
    prefix: "/"
  });
  await fastify.register(websocketPlugin, {
    options: { maxPayload: 1048576 }
  });
  fastify.register(viewPlugin, {
    root: path.join(__dirname, "public"),
    engine: {
      handlebars
    },
    viewExt: "html"
  });
  await fastify.register(trpcPlugin);
  fastify.get("/", async (_request, reply) => {
    return renderPage(reply);
  });
  fastify.setNotFoundHandler(async (_request, reply) => {
    return renderPage(reply);
  });
  fastify.post<{
    Body: Buffer;
  }>("/upload", async (req, res) => {
    if (req.headers.origin) {
      res.header("Access-Control-Allow-Origin", fastify.config.PUBLIC_APP_URL);
      res.header("Access-Control-Allow-Methods", "GET");
    } else if (
      fastify.config.NODE_ENV !== "development" &&
      !fastify.config.PUBLIC_APP_URL.includes("localhost")
    ) {
      return res.status(400).send("Cannot upload from this origin");
    }

    try {
      const auth = await processAuth({ db: fastify.mongo.db!, fastify, req, res });
      const data = await req.file();
      const key = `${auth?.data.workspaceId || "vrite-editor"}/${nanoid()}.${
        mime.extension(data?.mimetype || "") || ""
      }`;
      const buffer = await data?.toBuffer();

      if (!buffer) throw errors.badRequest();

      const sanitizedBuffer = await sharp(buffer).toBuffer();
      const command = new PutObjectCommand({
        Bucket: fastify.config.S3_BUCKET,
        Body: sanitizedBuffer,
        Key: key,
        ContentType: data?.mimetype,
        CacheControl: "public,max-age=31536000,immutable",
        ACL: "public-read"
      });

      await fastify.s3.send(command);

      return {
        key
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);

      throw errors.serverError();
    }
  });
});

export { appService };
