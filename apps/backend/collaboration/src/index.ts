import { writingPlugin } from "./writing";
import {
  OAuthPlugin,
  createServer,
  databasePlugin,
  pubSubPlugin,
  searchPlugin,
  sessionPlugin
} from "@vrite/backend";

(async () => {
  const server = await createServer(async (server) => {
    await server.register(databasePlugin);
    await server.register(pubSubPlugin);
    await server.register(sessionPlugin).register(OAuthPlugin);
    await server.register(searchPlugin);
  });

  await server.register(writingPlugin);
})();
