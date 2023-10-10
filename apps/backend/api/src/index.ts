import { apiService } from "./api";
import { generateOpenApiDocument } from "trpc-openapi";
import { createServer, appRouter } from "@vrite/backend";

(async () => {
  const server = await createServer({
    database: true,
    pubSub: true,
    auth: true,
    email: true,
    gitSync: true,
    search: true
  });

  await server.register(apiService);
  server.get("/swagger.json", (req, res) => {
    res.send(
      generateOpenApiDocument(appRouter, {
        baseUrl: server.config.PUBLIC_API_URL,
        title: "Vrite API",
        version: "0.3.0"
      })
    );
  });

  return server.listen({ host: server.config.HOST, port: server.config.PORT }, (err) => {
    if (err) {
      server.log.error(err);
      process.exit(1);
    }
  });
})();
