import { ObjectId } from "mongodb";
import { z } from "zod";
import { procedure, router } from "#lib/trpc";
import { isAuthenticated } from "#lib/middleware";
import { zodId } from "#lib/mongo";
import * as errors from "#lib/errors";
import { ContentGroup, contentGroup, getWorkspacesCollection } from "#database/workspaces";
import { getContentPiecesCollection } from "#database/content-pieces";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";
import { getContentsCollection } from "#database/contents";
import { runWebhooks } from "#lib/webhooks";

type ContentGroupEvent =
  | {
      action: "create";
      data: ContentGroup & { id: string };
    }
  | {
      action: "update";
      data: Partial<ContentGroup> & { id: string };
    }
  | { action: "delete"; data: { id: string } }
  | { action: "move"; data: { id: string; index: number } };

const publishEvent = createEventPublisher<ContentGroupEvent>(
  (workspaceId) => `contentGroups:${workspaceId}`
);
const basePath = "/content-groups";
const authenticatedProcedure = procedure.use(isAuthenticated);
const contentGroupsRouter = router({
  update: authenticatedProcedure
    .meta({
      openapi: { method: "PUT", path: basePath, protect: true },
      permissions: { session: ["manageDashboard"], token: ["contentGroups:write"] }
    })
    .input(contentGroup.partial().required({ id: true }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const { id, ...update } = input;
      const workspacesCollection = getWorkspacesCollection(ctx.db);
      const workspace = await workspacesCollection.findOne({ _id: ctx.auth.workspaceId });
      const contentGroup = workspace?.contentGroups.find((contentGroup) => {
        return contentGroup._id.equals(id);
      });

      if (!contentGroup) throw errors.notFound("contentGroup");

      await workspacesCollection.updateOne(
        {
          _id: ctx.auth.workspaceId
        },
        {
          $set: {
            contentGroups: workspace!.contentGroups.map((contentGroup) => {
              if (contentGroup._id.equals(id)) {
                return {
                  ...contentGroup,
                  ...update
                };
              }

              return contentGroup;
            })
          }
        }
      );
      publishEvent(ctx, `${ctx.auth.workspaceId}`, { action: "update", data: { id, ...update } });
    }),
  create: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: basePath, protect: true },
      permissions: { session: ["manageDashboard"], token: ["contentGroups:write"] }
    })
    .input(contentGroup.omit({ id: true }))
    .output(z.object({ id: zodId() }))
    .mutation(async ({ ctx, input }) => {
      const workspacesCollection = getWorkspacesCollection(ctx.db);
      const workspace = await workspacesCollection.findOne({ _id: ctx.auth.workspaceId });

      if (!workspace) throw errors.notFound("workspace");

      const contentGroup = {
        ...input,
        _id: new ObjectId()
      };

      await workspacesCollection.updateOne(
        {
          _id: ctx.auth.workspaceId
        },
        {
          $push: {
            contentGroups: contentGroup
          }
        }
      );
      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "create",
        data: {
          id: `${contentGroup._id}`,
          ...input
        }
      });
      runWebhooks(ctx, "contentGroupAdded", { id: `${contentGroup._id}`, ...input });

      return { id: `${contentGroup._id}` };
    }),
  delete: authenticatedProcedure
    .meta({
      openapi: { method: "DELETE", path: basePath, protect: true },
      permissions: { session: ["manageDashboard"], token: ["contentGroups:write"] }
    })
    .input(
      z.object({
        id: zodId()
      })
    )
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const workspacesCollection = getWorkspacesCollection(ctx.db);
      const contentPiecesCollection = getContentPiecesCollection(ctx.db);
      const contentsCollection = getContentsCollection(ctx.db);
      const workspace = await workspacesCollection.findOne({ _id: ctx.auth.workspaceId });
      const contentGroupId = new ObjectId(input.id);
      const contentGroup = workspace?.contentGroups.find((contentGroup) => {
        return contentGroup._id.equals(contentGroupId);
      });

      if (!contentGroup) throw errors.notFound("contentGroup");

      await workspacesCollection.updateOne(
        {
          _id: new ObjectId(ctx.auth.workspaceId)
        },
        {
          $pull: { contentGroups: { _id: contentGroupId } }
        }
      );
      await contentPiecesCollection.deleteMany({ contentGroupId });
      await contentsCollection.deleteMany({ contentGroupId });
      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "delete",
        data: input
      });
      runWebhooks(ctx, "contentGroupAdded", { ...contentGroup, id: `${contentGroup._id}` });
    }),
  list: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: `${basePath}/list`, protect: true },
      permissions: { token: ["contentGroups:read"] }
    })
    .input(z.void())
    .output(z.array(contentGroup))
    .query(async ({ ctx }) => {
      const workspacesCollection = getWorkspacesCollection(ctx.db);
      const workspace = await workspacesCollection.findOne({ _id: ctx.auth.workspaceId });

      if (!workspace) throw errors.notFound("workspace");

      return workspace.contentGroups.map((contentGroup) => {
        return {
          ...contentGroup,
          id: `${contentGroup._id}`
        };
      });
    }),
  move: authenticatedProcedure
    .meta({
      permissions: { session: ["manageDashboard"] }
    })
    .input(z.object({ id: zodId(), index: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const workspacesCollection = getWorkspacesCollection(ctx.db);
      const workspace = await workspacesCollection.findOne({ _id: ctx.auth.workspaceId });
      const contentGroup = workspace?.contentGroups.find((contentGroup) => {
        return contentGroup._id.equals(input.id);
      });

      if (!workspace || !contentGroup) throw errors.notFound("contentGroup");

      const newContentGroups = [...workspace!.contentGroups];

      newContentGroups.splice(newContentGroups.indexOf(contentGroup), 1);
      newContentGroups.splice(input.index, 0, contentGroup);
      await workspacesCollection.updateOne(
        { _id: workspace!._id },
        { $set: { contentGroups: newContentGroups } }
      );
      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "move",
        data: input
      });
    }),
  changes: authenticatedProcedure.subscription(async ({ ctx }) => {
    return createEventSubscription<ContentGroupEvent>(ctx, `contentGroups:${ctx.auth.workspaceId}`);
  })
});

export { contentGroupsRouter };
