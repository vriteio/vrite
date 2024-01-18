import { appService } from "./app";
import { createServer, webhooksPlugin } from "@vrite/backend";
import {
  databasePlugin,
  pubSubPlugin,
  gitSyncPlugin,
  searchPlugin,
  s3Plugin,
  sessionPlugin,
  OAuthPlugin,
  emailPlugin
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
    await server.register(s3Plugin);
  });

  await server.register(appService);
  server.listen({ host: server.config.HOST, port: server.config.PORT }, (err) => {
    if (err) {
      server.log.error(err);
      process.exit(1);
    }
  });
})();
