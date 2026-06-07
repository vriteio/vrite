import Fastify from "fastify";
import { viteSSRPlugin } from "./vite-ssr-plugin";

const host = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);
const app = Fastify();

app.register(viteSSRPlugin);

await app.listen({ host, port });

console.log(`Server is running on port ${port}`);
