import { extensionsService } from "./extensions";
import { createServer, z } from "@vrite/backend";

(async () => {
  const server = await createServer({
    OPENAI_API_KEY: z.string(),
    OPENAI_ORGANIZATION: z.string()
  });

  await server.register(extensionsService);

  return server.listen({ host: server.config.HOST, port: server.config.PORT }, (err) => {
    if (err) {
      server.log.error(err);
      process.exit(1);
    }
  });
})();
