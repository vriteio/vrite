import * as getTag from "./handlers/get";
import * as updateTag from "./handlers/update";
import * as createTag from "./handlers/create";
import * as deleteTag from "./handlers/delete";
import * as listTags from "./handlers/list";
import * as searchTags from "./handlers/search";
import { z } from "zod";
import { isAuthenticated } from "#lib/middleware";
import { procedure, router } from "#lib/trpc";
import { subscribeToTagEvents } from "#events";

const authenticatedProcedure = procedure.use(isAuthenticated);
const basePath = "/tags";
const tagsRouter = router({
  get: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: basePath, protect: true },
      permissions: { token: ["tags:read"] }
    })
    .input(getTag.inputSchema)
    .output(getTag.outputSchema)
    .query(async ({ input, ctx }) => {
      return getTag.handler(ctx, input);
    }),
  update: authenticatedProcedure
    .meta({
      openapi: { method: "PUT", path: basePath, protect: true },
      permissions: { session: ["editMetadata"], token: ["tags:write"] }
    })
    .input(updateTag.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return updateTag.handler(ctx, input);
    }),
  create: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: basePath, protect: true },
      permissions: { session: ["editMetadata"], token: ["tags:write"] }
    })
    .input(createTag.inputSchema)
    .output(createTag.outputSchema)
    .mutation(async ({ ctx, input }) => {
      return createTag.handler(ctx, input);
    }),
  list: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: `${basePath}/list`, protect: true },
      permissions: { token: ["tags:read"] }
    })
    .input(listTags.inputSchema)
    .output(listTags.outputSchema)
    .query(async ({ ctx, input }) => {
      return listTags.handler(ctx, input);
    }),
  delete: authenticatedProcedure
    .meta({
      openapi: { method: "DELETE", path: basePath, protect: true },
      permissions: { session: ["editMetadata"], token: ["tags:write"] }
    })
    .input(deleteTag.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return deleteTag.handler(ctx, input);
    }),
  search: authenticatedProcedure
    .input(searchTags.inputSchema)
    .output(searchTags.outputSchema)
    .query(async ({ ctx, input }) => {
      return searchTags.handler(ctx, input);
    }),
  changes: authenticatedProcedure.input(z.void()).subscription(({ ctx }) => {
    return subscribeToTagEvents(ctx, `${ctx.auth.workspaceId}`);
  })
});

export { tagsRouter };
