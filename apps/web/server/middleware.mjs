import { toFetchHandler } from "srvx/node";
import { serveStatic } from "srvx/static";
import { clientRoot, isProduction } from "./config.mjs";
import {
  appendRedirectTo,
  getRequestURL,
  isPageRequestMethod,
  isStaticAssetPath,
  normalizeRedirectTo,
  passthroughRoutes,
  redirectResponse,
  viteMissHeader
} from "./http.mjs";

const createStaticMiddleware = () => {
  const serveClientAsset = serveStatic({ dir: clientRoot });

  return async (request, next) => {
    if (!isProduction || !isPageRequestMethod(request.method)) {
      return next();
    }

    const { pathname } = getRequestURL(request);

    if (isStaticAssetPath(pathname)) {
      return serveClientAsset(request, next);
    }

    return next();
  };
};

const createSessionMiddleware = ({ getLoadModule }) => {
  return async (request, next) => {
    const url = getRequestURL(request);
    const isAuthRoute = url.pathname.startsWith("/auth");
    const redirectTo = normalizeRedirectTo(
      `${url.pathname}${url.search}${url.hash}` === "/"
        ? null
        : `${url.pathname}${url.search}${url.hash}`
    );

    if (passthroughRoutes.has(url.pathname)) {
      return next();
    }

    const { getSessionForRequest } = await getLoadModule();
    const session = await getSessionForRequest(request);

    if (!session?.session && !isAuthRoute) {
      return redirectResponse(appendRedirectTo("/auth/sign-in", redirectTo));
    }

    if (session?.session && isAuthRoute) {
      const isAddAccount = url.searchParams.get("addAccount") === "true";
      const authRedirectTo = normalizeRedirectTo(url.searchParams.get("redirectTo"));

      if (isAddAccount) {
        return next();
      }

      return redirectResponse(authRedirectTo || "/");
    }

    if (session?.session && url.pathname === "/") {
      const { currentWorkspaceID } = session.user;

      if (currentWorkspaceID) {
        return redirectResponse(`/${currentWorkspaceID}/`);
      }

      return redirectResponse("/new-workspace");
    }

    return next();
  };
};

const createViteMiddleware = (vite) => {
  const viteFetch = toFetchHandler((request, response, next) => {
    vite.middlewares(request, response, (error) => {
      if (error) {
        next(error);
        return;
      }

      if (response.writableEnded) {
        return;
      }

      response.statusCode = 200;
      response.setHeader(viteMissHeader, "1");
      response.end();
    });
  });

  return async (request) => {
    if (!isPageRequestMethod(request.method)) {
      return null;
    }

    const response = await viteFetch(
      new Request(request.url, {
        method: request.method,
        headers: request.headers
      })
    );

    return response.headers.get(viteMissHeader) === "1" ? null : response;
  };
};

export { createSessionMiddleware, createStaticMiddleware, createViteMiddleware };
