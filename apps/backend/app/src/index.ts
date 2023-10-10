import { appService } from "./app";
import { createServer } from "@vrite/backend";

(async () => {
  const server = await createServer({
    database: true,
    pubSub: true,
    auth: true,
    email: true,
    gitSync: true,
    search: true,
    storage: true
  });

  await server.register(appService);
  server.listen({ host: server.config.HOST, port: server.config.PORT }, (err) => {
    if (err) {
      server.log.error(err);
      process.exit(1);
    }
  });
})();
