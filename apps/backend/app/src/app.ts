import { appRouter, errors, publicPlugin, trpcPlugin } from "@vrite/backend";
import staticPlugin from "@fastify/static";
import websocketPlugin from "@fastify/websocket";
import axios from "axios";
import viewPlugin from "@fastify/view";
import handlebars from "handlebars";
import { FastifyReply } from "fastify";
import { processAuth } from "@vrite/backend/src/lib/auth";
import { nanoid } from "nanoid";
import multipartPlugin from "@fastify/multipart";
import mime from "mime-types";
import sharp from "sharp";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import path from "path";

const appService = publicPlugin(async (fastify) => {
  const renderPage = async (reply: FastifyReply): Promise<void> => {
    return reply.view("index.html", {
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
  fastify.get<{ Querystring: { url: string } }>("/proxy*", async (request, reply) => {
    const filterOutRegex =
      /(localhost|\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)(?::\d{0,4})?\b)/;

    if (request.headers.origin) {
      reply.header("Access-Control-Allow-Origin", fastify.config.PUBLIC_APP_URL);
      reply.header("Access-Control-Allow-Methods", "GET");
      reply.header(
        "Access-Control-Allow-Headers",
        request.headers["access-control-request-headers"]
      );
    } else if (
      fastify.config.NODE_ENV !== "development" &&
      !fastify.config.PUBLIC_APP_URL.includes("localhost")
    ) {
      // Prevent proxy abuse in production
      return reply.status(400).send("Invalid Origin");
    }

    if (
      filterOutRegex.test(request.query.url) &&
      !request.query.url.includes(fastify.config.PUBLIC_ASSETS_URL)
    ) {
      return reply.status(400).send("Invalid URL");
    }

    if (request.method === "OPTIONS") {
      // CORS Preflight
      reply.send();
    } else {
      const targetURL = request.query.url;

      try {
        const response = await axios.get(targetURL, {
          responseType: "arraybuffer"
        });

        if (!`${response.headers["content-type"]}`.includes("image")) {
          return reply.status(400).send("Invalid Content-Type");
        }

        reply.header("content-type", response.headers["content-type"]);
        reply.send(Buffer.from(response.data, "binary"));
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);

        return reply.status(500).send("Could not fetch");
      }
    }
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
