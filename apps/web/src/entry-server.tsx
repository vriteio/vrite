// @refresh reload
import { renderToStream, renderToString, HydrationScript } from "solid-js/web";
import { provideRequestEvent } from "solid-js/web/storage";
import { getSessionData } from "./lib/session";
import App from "./app";
import { createRequestEvent } from "./server/request-event";

interface RenderOptions {
  request: Request;
  template: string;
}

const getURL = (request: Request) => {
  const { pathname, search, hash } = new URL(request.url);

  return `${pathname}${search}${hash}`;
};

const getSessionForRequest = async (request: Request) => {
  const requestEvent = createRequestEvent(request);

  return provideRequestEvent(requestEvent, async () => {
    return getSessionData(request);
  });
};

const render = async ({ request, template }: RenderOptions) => {
  const requestEvent = createRequestEvent(request);
  const hydratedTemplate = template.replace(
    "<!--app-head-->",
    renderToString(() => <HydrationScript />)
  );
  const [start, end] = hydratedTemplate.split("<!--ssr-outlet-->");

  if (end === undefined) {
    throw new Error("SSR template is missing the ssr outlet placeholder.");
  }

  requestEvent.response.headers.set("Content-Type", "text/html; charset=utf-8");

  return provideRequestEvent(requestEvent, () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(start));

        const sink = new WritableStream<string | Uint8Array>({
          write(chunk) {
            controller.enqueue(typeof chunk === "string" ? encoder.encode(chunk) : chunk);
          },
          close() {
            controller.close();
          },
          abort(error) {
            controller.error(error);
          }
        });
        const { pipeTo } = renderToStream(() => <App url={getURL(request)} />, {
          onCompleteAll({ write }) {
            write(end);
          },
          onError(error) {
            controller.error(error);
          }
        });

        void pipeTo(sink).catch((error) => {
          controller.error(error);
        });
      }
    });

    return new Response(stream, {
      status: requestEvent.response.status || 200,
      statusText: requestEvent.response.statusText,
      headers: requestEvent.response.headers
    });
  });
};

export { getSessionForRequest, render };
