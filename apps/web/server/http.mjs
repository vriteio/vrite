const staticAssetPattern = /\/[^/]+\.[A-Za-z\d]+$/;
const passthroughRoutes = new Set(["/invite", "/new-workspace"]);
const viteMissHeader = "x-vite-middleware-miss";
const notFoundResponse = new Response("Not found", { status: 404 });

const isPageRequestMethod = (method) => {
  return method === "GET" || method === "HEAD";
};

const getRequestURL = (request) => {
  return new URL(request.url);
};

const isStaticAssetPath = (pathname) => {
  return pathname.startsWith("/assets/") || staticAssetPattern.test(pathname);
};

const normalizeRedirectTo = (value) => {
  if (!value) return null;

  const trimmed = value.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  return trimmed;
};

const appendRedirectTo = (path, redirectTo) => {
  const normalizedRedirect = normalizeRedirectTo(redirectTo);

  if (!normalizedRedirect) return path;

  const separator = path.includes("?") ? "&" : "?";

  return `${path}${separator}redirectTo=${encodeURIComponent(normalizedRedirect)}`;
};

const redirectResponse = (location) => {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location
    }
  });
};

export {
  appendRedirectTo,
  getRequestURL,
  isPageRequestMethod,
  isStaticAssetPath,
  normalizeRedirectTo,
  notFoundResponse,
  passthroughRoutes,
  redirectResponse,
  viteMissHeader
};
