import { appRouter, publicPlugin, trpcPlugin } from "@vrite/backend";
import staticPlugin from "@fastify/static";
import websocketPlugin from "@fastify/websocket";
import axios from "axios";
import viewPlugin from "@fastify/view";
import handlebars from "handlebars";
import { FastifyReply } from "fastify";
import path from "path";

const appService = publicPlugin(async (fastify) => {
  const renderPage = async (reply: FastifyReply): Promise<void> => {
    return reply.view("index.html", {
      PUBLIC_APP_URL: fastify.config.PUBLIC_APP_URL,
      PUBLIC_API_URL: fastify.config.PUBLIC_API_URL,
      PUBLIC_COLLAB_URL: fastify.config.PUBLIC_COLLAB_URL,
      PUBLIC_ASSETS_URL: fastify.config.PUBLIC_ASSETS_URL,
      PUBLIC_APP_TYPE: fastify.config.PUBLIC_APP_TYPE
    });
  };

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
    } else if (fastify.config.NODE_ENV !== "development") {
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
      const response = await axios.get(targetURL, {
        responseType: "arraybuffer"
      });

      if (!`${response.headers["content-type"]}`.includes("image")) {
        return reply.status(400).send("Invalid Content-Type");
      }

      reply.header("content-type", response.headers["content-type"]);
      reply.send(Buffer.from(response.data, "binary"));
    }
  });
});

export { appService };
