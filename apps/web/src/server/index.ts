import fs from "node:fs/promises";
import path from "node:path";
import Fastify from "fastify";
import { viteSSRPlugin } from "./vite-ssr-plugin";

const host = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);
const httpsKeyPath = process.env.HTTPS_KEY_PATH;
const httpsCertPath = process.env.HTTPS_CERT_PATH;
const hasIncompleteHTTPSConfig = Boolean(httpsKeyPath) !== Boolean(httpsCertPath);

if (hasIncompleteHTTPSConfig) {
  throw new Error("HTTPS_KEY_PATH and HTTPS_CERT_PATH must be set together");
}

const httpsEnabled = httpsKeyPath && httpsCertPath;
const app = Fastify({
  bodyLimit: 1_048_576,
  keepAliveTimeout: 10_000,
  maxRequestsPerSocket: 100,
  requestTimeout: 30_000,
  ...(httpsEnabled && {
    https: {
      key: await fs.readFile(path.resolve("../..", httpsKeyPath)),
      cert: await fs.readFile(path.resolve("../..", httpsCertPath))
    }
  })
});

app.register(viteSSRPlugin);

await app.listen({ host, port });

console.log(`Server is running on ${httpsEnabled ? "https" : "http"}://${host}:${port}`);
