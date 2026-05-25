import { createMiddleware } from "@solidjs/start/middleware";
import { sendRedirect } from "vinxi/http";
import { client } from "./lib/client";

export default createMiddleware({
  onRequest: [
    async (event) => {
      const url = new URL(event.request.url);
      const cookieHeader = event.request.headers.get("cookie") || "";
      const { data } = await client.auth["is-signed-in"].get({
        headers: {
          cookie: cookieHeader
        }
      });

      if (!data?.signedIn && !url.pathname.startsWith("/auth")) {
        return sendRedirect(event.nativeEvent, "/auth/sign-in");
      }

      if (data?.signedIn && url.pathname.startsWith("/auth")) {
        return sendRedirect(event.nativeEvent, "/");
      }
    }
  ]
});
