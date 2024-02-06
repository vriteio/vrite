import * as getWorkspaceMembership from "./handlers/get";
import * as updateWorkspaceMembership from "./handlers/update";
import * as deleteWorkspaceMembership from "./handlers/delete";
import * as listMembers from "./handlers/list-members";
import * as listWorkspaces from "./handlers/list-workspaces";
import * as sendInvite from "./handlers/send-invite";
import * as leaveWorkspace from "./handlers/leave";
import * as searchMembers from "./handlers/search-members";
import { z } from "zod";
import { router, procedure } from "#lib/trpc";
import { isAuthenticated, isAuthenticatedUser } from "#lib/middleware";
import { subscribeToWorkspaceMembershipEvents } from "#events";

const authenticatedProcedure = procedure.use(isAuthenticated);
const authenticatedUserProcedure = procedure.use(isAuthenticatedUser);
const basePath = "/workspace-memberships";
const workspaceMembershipsRouter = router({
  update: authenticatedProcedure
    .meta({
      openapi: { method: "PUT", path: basePath, protect: true },
      permissions: { session: ["manageWorkspace"], token: ["workspaceMemberships:write"] }
    })
    .input(updateWorkspaceMembership.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return updateWorkspaceMembership.handler(ctx, input);
    }),
  listMembers: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: `${basePath}/list-members`, protect: true },
      permissions: { token: ["workspaceMemberships:read"] }
    })
    .input(listMembers.inputSchema)
    .output(listMembers.outputSchema)
    .query(async ({ ctx, input }) => {
      return listMembers.handler(ctx, input);
    }),
  listWorkspaces: authenticatedUserProcedure
    .meta({
      openapi: { method: "GET", path: `${basePath}/list-workspaces`, protect: true },
      permissions: { token: ["workspaceMemberships:read"] }
    })
    .input(listWorkspaces.inputSchema)
    .output(listWorkspaces.outputSchema)
    .query(async ({ ctx, input }) => {
      return listWorkspaces.handler(ctx, input);
    }),
  sendInvite: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: basePath, protect: true },
      permissions: { session: ["manageWorkspace"], token: ["workspaceMemberships:write"] }
    })
    .input(sendInvite.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return sendInvite.handler(ctx, input);
    }),

  delete: authenticatedProcedure
    .meta({
      openapi: { method: "DELETE", path: basePath, protect: true },
      permissions: { session: ["manageWorkspace"], token: ["workspaceMemberships:write"] }
    })
    .input(deleteWorkspaceMembership.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return deleteWorkspaceMembership.handler(ctx, input);
    }),
  leave: authenticatedProcedure
    .input(z.void())
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return leaveWorkspace.handler(ctx);
    }),

  searchMembers: authenticatedProcedure
    .input(searchMembers.inputSchema)
    .output(searchMembers.outputSchema)
    .query(async ({ ctx, input }) => {
      return searchMembers.handler(ctx, input);
    }),
  get: authenticatedProcedure
    .input(getWorkspaceMembership.inputSchema)
    .output(getWorkspaceMembership.outputSchema)
    .query(async ({ ctx, input }) => {
      return getWorkspaceMembership.handler(ctx, input);
    }),
  changes: authenticatedProcedure.subscription(({ ctx }) => {
    return subscribeToWorkspaceMembershipEvents(ctx, `${ctx.auth.workspaceId}`);
  })
});

export { workspaceMembershipsRouter };
