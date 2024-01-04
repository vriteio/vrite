import { assetsService } from "./assets";
import { createServer, s3Plugin } from "@vrite/backend";

(async () => {
  const server = await createServer(async (server) => {
    await server.register(s3Plugin);
  });

  await server.register(assetsService);

  return server.listen({ host: server.config.HOST, port: server.config.PORT }, (err) => {
    if (err) {
      server.log.error(err);
      process.exit(1);
    }
  });
})();
