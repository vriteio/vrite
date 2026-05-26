import { createServer as createViteServer } from "vite";
import { serve } from "srvx";
import { isProduction, port, viteConfigPath } from "./config.mjs";
import { createModuleLoader, createTemplateLoader } from "./loaders.mjs";
import {
  createSessionMiddleware,
  createStaticMiddleware,
  createViteMiddleware
} from "./middleware.mjs";
import { createRenderHandler } from "./render.mjs";

const start = async () => {
  let vite = null;
  let viteMiddleware = null;
  let loadModule = async () => Promise.reject(new Error("SSR module loader not initialized"));
  let render = () => new Response("Server not initialized", { status: 500 });
  const sessionMiddleware = createSessionMiddleware({
    getLoadModule: () => loadModule()
  });
  const server = serve({
    manual: true,
    port,
    middleware: [
      async (request, next) => {
        const devResponse = await viteMiddleware?.(request);

        if (devResponse) {
          return devResponse;
        }

        return next();
      },
      createStaticMiddleware(),
      sessionMiddleware
    ],
    fetch: (request) => render(request)
  });

  if (!isProduction) {
    vite = await createViteServer({
      configFile: viteConfigPath,
      appType: "custom",
      server: {
        middlewareMode: {
          server: server.node.server
        }
      }
    });
    viteMiddleware = createViteMiddleware(vite);
  }

  loadModule = createModuleLoader(vite);
  const loadTemplate = createTemplateLoader(vite);
  render = createRenderHandler({ loadModule, loadTemplate, vite });

  await server.serve();
};

void start();
