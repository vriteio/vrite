import { apiService } from "./api";
import { generateOpenApiDocument } from "trpc-openapi";
import {
  createServer,
  appRouter,
  OAuthPlugin,
  databasePlugin,
  emailPlugin,
  gitSyncPlugin,
  pubSubPlugin,
  searchPlugin,
  sessionPlugin,
  webhooksPlugin,
  billingPlugin
} from "@vrite/backend";

(async () => {
  const server = await createServer(async (server) => {
    await server.register(databasePlugin);
    await server.register(pubSubPlugin);
    await server.register(sessionPlugin).register(OAuthPlugin);
    await server.register(emailPlugin);
    await server.register(gitSyncPlugin);
    await server.register(searchPlugin);
    await server.register(webhooksPlugin);
    await server.register(billingPlugin);
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
