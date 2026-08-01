import Fastify from "fastify";
import { viteSSRPlugin } from "./vite-ssr-plugin";

const host = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);
const app = Fastify({
  bodyLimit: 1_048_576,
  keepAliveTimeout: 10_000,
  maxRequestsPerSocket: 100,
  requestTimeout: 30_000
});

app.register(viteSSRPlugin);

await app.listen({ host, port });

console.log(`Server is running on ${host}:${port}`);
