import { config } from "#web/lib/config";

const normalizeRedirectTo = (value?: string | null): string | null => {
  if (!value) return null;

  const trimmed = value.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  return trimmed;
};

const appendRedirectTo = (path: string, redirectTo?: string | null): string => {
  const normalizedRedirect = normalizeRedirectTo(redirectTo);

  if (!normalizedRedirect) return path;

  const separator = path.includes("?") ? "&" : "?";

  return `${path}${separator}redirectTo=${encodeURIComponent(normalizedRedirect)}`;
};

const toCallbackURL = (redirectTo?: string | null): string => {
  const normalizedRedirect = normalizeRedirectTo(redirectTo);

  if (!normalizedRedirect) return config.PUBLIC_APP_URL;

  return `${config.PUBLIC_APP_URL}${normalizedRedirect}`;
};

export { normalizeRedirectTo, appendRedirectTo, toCallbackURL };