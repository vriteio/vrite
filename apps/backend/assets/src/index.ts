import { assetsService } from "./api";
import { createServer } from "@vrite/backend";
import corsPlugin from "@fastify/cors";
import multipartPlugin from "@fastify/multipart";

(async () => {
  const server = await createServer();

  await server.register(multipartPlugin, {
    limits: {
      fileSize: 10 * 1024 * 1024
    }
  });
  await server.register(corsPlugin, {
    credentials: true,
    methods: ["GET", "POST"],
    origin(origin, callback) {
      if (!origin || origin === "null") {
        if (server.config.NODE_ENV !== "development") {
          callback(new Error("Not allowed"), false);
        }

        callback(null, true);

        return;
      }

      const { hostname } = new URL(origin);
      const appHostname = new URL(server.config.PUBLIC_APP_URL).hostname;

      if (hostname === "localhost" || hostname.endsWith(appHostname)) {
        //  Request from localhost will pass
        callback(null, true);

        return;
      }

      callback(new Error("Not allowed"), false);
    }
  });
  await server.register(assetsService);

  return server.listen({ host: server.config.HOST, port: server.config.PORT }, (err) => {
    if (err) {
      server.log.error(err);
      process.exit(1);
    }
  });
})();
