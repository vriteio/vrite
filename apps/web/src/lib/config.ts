const WS_PROTOCOL = import.meta.env.PUBLIC_SECURE === "true" ? "wss" : "ws";
const HTTP_PROTOCOL = import.meta.env.PUBLIC_SECURE === "true" ? "https" : "http";
const config = {
  PUBLIC_API_HOST: import.meta.env.PUBLIC_API_HOST,
  PUBLIC_APP_HOST: import.meta.env.PUBLIC_APP_HOST,
  PUBLIC_COOKIE_DOMAIN: import.meta.env.PUBLIC_COOKIE_DOMAIN,
  PUBLIC_SECURE: import.meta.env.PUBLIC_SECURE === "true",
  PUBLIC_API_URL: `${HTTP_PROTOCOL}://${import.meta.env.PUBLIC_API_HOST}`,
  PUBLIC_WS_API_URL: `${WS_PROTOCOL}://${import.meta.env.PUBLIC_API_HOST}`,
  PUBLIC_APP_URL: `${HTTP_PROTOCOL}://${import.meta.env.PUBLIC_APP_HOST}`
};

export { config };
