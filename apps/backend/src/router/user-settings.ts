import Elysia from "elysia";

const usersRouterPlugin = new Elysia({
  prefix: "/user-settings"
});

export { usersRouterPlugin };
