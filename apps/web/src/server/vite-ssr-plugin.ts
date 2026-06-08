import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import fastifyStatic from "@fastify/static";
import middie from "@fastify/middie";
import type { FastifyPluginAsync } from "fastify";
import type { Render } from "#web/entry-server";
import type { ViteDevServer } from "vite";

const isProduction = process.env.NODE_ENV === "production";
const base = process.env.BASE ?? "/";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);
const webRootPath = path.resolve(currentDirPath, "../..");
const clientDistPath = path.resolve(webRootPath, "dist/client");
const clientTemplatePath = path.resolve(clientDistPath, "index.html");
const serverEntryPath = pathToFileURL(
  path.resolve(webRootPath, "dist/server/entry-server.js")
).href;
const viteSSRPlugin: FastifyPluginAsync = async (app) => {
  const templateHtml = isProduction ? await fs.readFile(clientTemplatePath, "utf-8") : "";

  let vite: ViteDevServer | undefined;

  app.removeAllContentTypeParsers();
  app.addContentTypeParser("*", function (_request, payload, done) {
    done(null, payload);
  });

  if (!isProduction) {
    await app.register(middie);

    const { createServer } = await import("vite");

    vite = await createServer({
      server: { middlewareMode: true },
      appType: "custom",
      base
    });

    app.use(vite.middlewares);
    app.addHook("onClose", async () => {
      await vite?.close();
    });
  } else {
    await app.register(fastifyStatic, {
      root: clientDistPath,
      serve: false
    });
  }

  app.route({
    method: ["GET", "HEAD"],
    url: "*",
    async handler(request, reply) {
      const requestUrl = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);

      if (path.extname(requestUrl.pathname)) {
        return reply.sendFile(requestUrl.pathname);
      }

      try {
        const ssrUrl = `${requestUrl.pathname}${requestUrl.search}`;

        let template = templateHtml;
        let render: Render;
        if (!isProduction) {
          template = await fs.readFile(path.resolve(webRootPath, "index.html"), "utf-8");
          template = await vite!.transformIndexHtml(ssrUrl, template);
          render = (await vite!.ssrLoadModule("/src/entry-server.tsx")).render as Render;
        } else {
          render = (await import(serverEntryPath)).render as Render;
        }

        return render(
          {
            request,
            reply
          },
          {
            template
          }
        );
      } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        vite?.ssrFixStacktrace(normalizedError);
        request.log.error(normalizedError);

        return reply
          .status(500)
          .type("text/plain")
          .send(normalizedError.stack ?? normalizedError.message);
      }
    }
  });
};

export { viteSSRPlugin };
