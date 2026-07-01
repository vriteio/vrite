import { config } from "#web/lib/config";
import { authClient } from "./client";
import { validateWorkspaceID } from "./validate";

const normalizeRedirectTo = (value?: string | null): string | null => {
  const redirectTo = value?.trim();

  if (!redirectTo || !redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return null;
  }

  return redirectTo;
};

const appendRedirectTo = (path: string, redirectTo?: string | null) => {
  const normalizedRedirectTo = normalizeRedirectTo(redirectTo);

  if (!normalizedRedirectTo) return path;

  const url = new URL(path, config.PUBLIC_APP_URL);

  url.searchParams.set("redirectTo", normalizedRedirectTo);

  return `${url.pathname}${url.search}`;
};

const toCallbackURL = (redirectTo?: string | null) => {
  return `${config.PUBLIC_APP_URL}${normalizeRedirectTo(redirectTo) || ""}`;
};

const getPostAuthRedirectPath = async (redirectTo?: string | null) => {
  const normalizedRedirectTo = normalizeRedirectTo(redirectTo);

  if (normalizedRedirectTo) return normalizedRedirectTo;

  const { data } = await authClient.getSession();
  const currentWorkspaceID = data?.user.currentWorkspaceID;

  if (!data?.session) return "/auth/sign-in";
  if (currentWorkspaceID && validateWorkspaceID(currentWorkspaceID)) return `/${currentWorkspaceID}/`;

  return "/new-workspace";
};

const redirectAfterAuth = async (redirectTo?: string | null) => {
  window.location.assign(await getPostAuthRedirectPath(redirectTo));
};

export {
  appendRedirectTo,
  getPostAuthRedirectPath,
  normalizeRedirectTo,
  redirectAfterAuth,
  toCallbackURL
};
