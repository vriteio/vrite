import { appRouter, publicPlugin, trpcPlugin } from "@vrite/backend";
import staticPlugin from "@fastify/static";
import websocketPlugin from "@fastify/websocket";
import axios from "axios";
import path from "path";

const appService = publicPlugin(async (fastify) => {
  await fastify.register(staticPlugin, {
    root: path.join(__dirname, "public"),
    prefix: "/"
  });
  await fastify.register(websocketPlugin, {
    options: { maxPayload: 1048576 }
  });
  await fastify.register(trpcPlugin);
  fastify.setNotFoundHandler(async (_request, reply) => {
    return reply.sendFile("index.html");
  });
  fastify.get<{ Querystring: { url: string } }>("/proxy*", async (request, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    reply.header("Access-Control-Allow-Methods", "GET");
    reply.header("Access-Control-Allow-Headers", request.headers["access-control-request-headers"]);

    if (request.method === "OPTIONS") {
      // CORS Preflight
      reply.send();
    } else {
      const targetURL = request.query.url;
      const response = await axios.get(targetURL, {
        responseType: "arraybuffer"
      });

      reply.header("Content-Type", response.headers["Content-Type"]);
      reply.send(Buffer.from(response.data, "binary"));
    }
  });
});

export { appService };
