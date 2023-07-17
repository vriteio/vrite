import { apiService } from "./api";
import { generateOpenApiDocument } from "trpc-openapi";
import { createServer, appRouter } from "@vrite/backend";

(async () => {
  const server = await createServer();

  await server.register(apiService);
  await server.get("/swagger.json", (req, res) => {
    res.send(
      generateOpenApiDocument(appRouter, {
        baseUrl: "https://api.vrite.io",
        title: "Vrite API",
        version: "2023.7.17"
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
