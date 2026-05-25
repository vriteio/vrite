import { createMiddleware } from "@solidjs/start/middleware";
import { sendRedirect } from "vinxi/http";
import { authClient } from "#web/lib/client";
import { appendRedirectTo, normalizeRedirectTo } from "#web/lib/auth-redirect";

export default createMiddleware({
  onRequest: [
    async (event) => {
      const url = new URL(event.request.url);
      const cookieHeader = event.request.headers.get("cookie") || "";
      const { data } = await authClient.getSession({
        fetchOptions: {
          headers: {
            cookie: cookieHeader
          }
        }
      });
      const isAuthRoute = url.pathname.startsWith("/auth");
      const isNewWorkspace = url.pathname === "/new-workspace";
      const isInvite = url.pathname === "/invite";
      const redirectTo = normalizeRedirectTo(
        `${url.pathname}${url.search}${url.hash}` === "/"
          ? null
          : `${url.pathname}${url.search}${url.hash}`
      );

      // Allow invite and new-workspace routes through before auth redirects.
      if (isNewWorkspace || isInvite) return;

      if (!data?.session && !isAuthRoute) {
        return sendRedirect(event.nativeEvent, appendRedirectTo("/auth/sign-in", redirectTo));
      }

      if (data?.session && isAuthRoute) {
        // Allow access to auth routes when adding a new account
        const isAddAccount = url.searchParams.get("addAccount") === "true";
        const authRedirectTo = normalizeRedirectTo(url.searchParams.get("redirectTo"));

        if (isAddAccount) return;

        return sendRedirect(event.nativeEvent, authRedirectTo || "/");
      }

      // If the user is authenticated and visiting /, redirect to the last workspace
      if (data?.session && url.pathname === "/") {
        // Fall back to the user's currentWorkspaceID from session
        const { currentWorkspaceID } = data.user;

        if (currentWorkspaceID) {
          return sendRedirect(event.nativeEvent, `/${currentWorkspaceID}/`);
        }

        // Ultimate fallback: redirect to new workspace creation
        return sendRedirect(event.nativeEvent, "/new-workspace");
      }
    }
  ]
});
