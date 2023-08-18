import { procedure, router } from "../lib/trpc";
import { isAuthenticated, isAuthenticatedUser } from "../lib/middleware";
import { zodId } from "../lib";
import { z } from "zod";
import * as errors from "#lib/errors";
import { Workspace, getWorkspacesCollection, workspace } from "#database/workspaces";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";
import { createWorkspace, deleteWorkspace } from "#lib/workspace";
import { getUsersCollection } from "#database";

type WorkspaceEvent =
  | { action: "update"; data: Partial<Workspace> & { id: string } }
  | { action: "delete"; data: { id: string } };

const publishEvent = createEventPublisher<WorkspaceEvent>((workspaceId) => {
  return `workspace:${workspaceId}`;
});
const authenticatedProcedure = procedure.use(isAuthenticated);
const authenticatedUserProcedure = procedure.use(isAuthenticatedUser);
const basePath = "/workspace";
const workspacesRouter = router({
  get: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: basePath, protect: true },
      permissions: { token: ["workspace:read"] }
    })
    .input(z.void())
    .output(workspace.omit({ contentGroups: true }))
    .query(async ({ ctx }) => {
      const workspacesCollection = getWorkspacesCollection(ctx.db);
      const workspace = await workspacesCollection.findOne({
        _id: ctx.auth.workspaceId
      });

      if (!workspace) throw errors.notFound("workspace");

      return {
        id: `${workspace._id}`,
        name: workspace.name,
        logo: workspace.logo,
        description: workspace.description
      };
    }),
  changes: authenticatedProcedure.subscription(({ ctx }) => {
    return createEventSubscription<WorkspaceEvent>(ctx, `workspace:${ctx.auth.workspaceId}`);
  }),
  update: authenticatedProcedure
    .meta({
      permissions: { session: ["manageWorkspace"] }
    })
    .input(workspace.omit({ contentGroups: true }).partial().required({ id: true }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const workspacesCollection = getWorkspacesCollection(ctx.db);
      const { matchedCount } = await workspacesCollection.updateOne(
        { _id: ctx.auth.workspaceId },
        {
          $set: input
        }
      );

      if (!matchedCount) throw errors.notFound("workspace");

      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "update",
        data: input
      });
    }),
  create: authenticatedUserProcedure
    .input(
      z.object({
        name: z.string(),
        logo: z.string().optional(),
        description: z.string().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const usersCollection = getUsersCollection(ctx.db);
      const user = await usersCollection.findOne({
        _id: ctx.auth.userId
      });

      if (!user) throw errors.notFound("user");

      const workspaceId = await createWorkspace(user, ctx.fastify, input);

      return `${workspaceId}`;
    }),
  delete: authenticatedProcedure
    .meta({
      permissions: { session: ["manageWorkspace"] }
    })
    .input(z.void())
    .output(z.void())
    .mutation(async ({ ctx }) => {
      await deleteWorkspace(ctx.auth.workspaceId, ctx.fastify);
      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "delete",
        data: {
          id: `${ctx.auth.workspaceId}`
        }
      });
    })
});

export { workspacesRouter };
