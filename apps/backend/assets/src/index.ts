import { assetsService } from "./api";
import { createServer } from "@vrite/backend";

(async () => {
  const server = await createServer();

  await server.register(assetsService);

  return server.listen({ host: server.config.HOST, port: server.config.PORT }, (err) => {
    if (err) {
      server.log.error(err);
      process.exit(1);
    }
  });
})();
