import { writingPlugin } from "./writing";
import { createServer } from "@vrite/backend";

(async () => {
  const server = await createServer();

  await server.register(writingPlugin);
})();
