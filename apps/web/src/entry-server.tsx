/* @refresh reload */
import { generateHydrationScript, renderToStream } from "solid-js/web";
import { provideRequestEvent } from "solid-js/web/storage";
import { FastifyReply, FastifyRequest } from "fastify";
import { PassThrough, Readable } from "node:stream";
import App from "./app";

interface RenderConfig {
  template: string;
}

type Render = (
  ctx: { request: FastifyRequest; reply: FastifyReply },
  config: RenderConfig
) => Promise<void>;

const SSR_OUTLET = "<!--ssr-outlet-->";

const isRedirectResponse = (response: Response | { status: number; headers: Headers }): boolean => {
  return response.status >= 300 && response.status < 400 && response.headers.has("location");
};

const createWebRequest = (fastifyRequest: FastifyRequest): Request => {
  const url = new URL(
    fastifyRequest.url,
    `${import.meta.env.PUBLIC_SECURE ? "https" : "http"}://${fastifyRequest.headers.host}`
  );
  const hasBody = !["GET", "HEAD"].includes(fastifyRequest.method);
  const body = fastifyRequest.body;

  let webBody;

  if (hasBody && body) {
    if (body instanceof Readable) {
      webBody = Readable.toWeb(body);
    } else {
      throw new Error("Request body must be a Readable stream");
    }
  }

  return new Request(url, {
    method: fastifyRequest.method,
    // @ts-expect-error
    headers: new Headers(fastifyRequest.headers),
    // @ts-expect-error
    body: webBody,
    duplex: webBody ? "half" : undefined
  });
};
const render: Render = async (ctx, config) => {
  const webCtx = {
    request: createWebRequest(ctx.request),
    response: new Response()
  };
  const [templateStart, templateEnd] = config.template
    .replace("<!--app-head-->", generateHydrationScript())
    .split(SSR_OUTLET);

  if (templateEnd === undefined) {
    throw new Error("SSR template must include a <!--ssr-outlet--> placeholder");
  }

  let resolveShellReady: (() => void) | undefined;
  let rejectShellReady: ((reason?: unknown) => void) | undefined;

  const shellReady = new Promise<void>((resolve, reject) => {
    resolveShellReady = resolve;
    rejectShellReady = reject;
  });

  const stream = new PassThrough();

  const appStream = provideRequestEvent(webCtx, () => {
    return renderToStream(() => <App url={ctx.request.url} />, {
      onCompleteShell() {
        resolveShellReady?.();
      },
      onCompleteAll({ write }) {
        write(templateEnd);
        resolveShellReady?.();
      }
    });
  });

  stream.write(templateStart);
  appStream.pipe(stream);

  await shellReady.catch((error) => {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    ctx.request.log.error(normalizedError);
    throw normalizedError;
  });

  if (isRedirectResponse(webCtx.response)) {
    stream.destroy();
    ctx.reply.status(webCtx.response.status);

    for (const [key, value] of webCtx.response.headers) {
      ctx.reply.header(key, value);
    }

    return ctx.reply.send();
  }

  ctx.reply.status(webCtx.response.status);
  ctx.reply.header("Content-Type", "text/html");

  for (const [key, value] of webCtx.response.headers) {
    ctx.reply.header(key, value);
  }

  return ctx.reply.send(stream);
};

export { render };
export type { Render };
