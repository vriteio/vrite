import { writingPlugin } from "./writing";
import { createServer } from "@vrite/backend";

(async () => {
  const server = await createServer({
    database: true,
    auth: true,
    pubSub: true,
    search: true
  });

  await server.register(writingPlugin);
})();
