import Elysia from "elysia";
import { authRouterPlugin } from "./auth";
import { updatesRouterPlugin } from "./updates";
import { entriesRouterPlugin } from "./entries";

const routerPlugin = new Elysia()
  .use(authRouterPlugin)
  .use(entriesRouterPlugin)
  .use(updatesRouterPlugin);

export { routerPlugin };
