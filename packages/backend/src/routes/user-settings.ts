import { z } from "zod";
import { isAuthenticated, isAuthenticatedUser } from "#lib/middleware";
import { procedure, router } from "#lib/trpc";
import * as errors from "#lib/errors";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";
import {
  getWorkspacesCollection,
  getWorkspaceMembershipsCollection,
  AppearanceSettings,
  appearanceSettings,
  getUserSettingsCollection
} from "#database";
import { zodId } from "#lib";

type UserSettingsEvent = { action: "update"; data: Partial<AppearanceSettings> };

const publishEvent = createEventPublisher<UserSettingsEvent>((userId) => `userSettings:${userId}`);
const authenticatedUserProcedure = procedure.use(isAuthenticatedUser);
const authenticatedProcedure = procedure.use(isAuthenticated);
const basePath = "/user-settings";
const userSettingsRouter = router({
  update: authenticatedUserProcedure
    .meta({
      openapi: { method: "PUT", path: basePath, protect: true },
      permissions: { token: ["userSettings:write"] }
    })
    .input(appearanceSettings.partial())
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const userSettingsCollection = getUserSettingsCollection(ctx.db);
      const { matchedCount } = await userSettingsCollection.updateOne(
        { userId: ctx.auth.userId },
        { $set: { ...input } }
      );

      if (!matchedCount) throw errors.notFound("userSettings");

      publishEvent(ctx, `${ctx.auth.userId}`, { action: "update", data: input });
    }),
  get: authenticatedUserProcedure
    .meta({
      openapi: { method: "GET", path: basePath, protect: true },
      permissions: { token: ["userSettings:read"] }
    })
    .input(z.void())
    .output(appearanceSettings)
    .query(async ({ ctx }) => {
      const userSettingsCollection = getUserSettingsCollection(ctx.db);
      const userSettings = await userSettingsCollection.findOne({
        userId: ctx.auth.userId
      });

      if (!userSettings) throw errors.notFound("userSettings");

      return {
        codeEditorTheme: userSettings.codeEditorTheme,
        uiTheme: userSettings.uiTheme,
        accentColor: userSettings.accentColor
      };
    }),

  getWorkspaceId: authenticatedProcedure
    .input(z.void())
    .output(zodId())
    .query(async ({ ctx }) => {
      const workspacesCollection = getWorkspacesCollection(ctx.db);
      const workspaceMembershipsCollection = getWorkspaceMembershipsCollection(ctx.db);
      const workspace = await workspacesCollection.findOne({
        _id: ctx.auth.workspaceId
      });

      if (!workspace) throw errors.notFound("workspace");

      const workspaceMembership = await workspaceMembershipsCollection.findOne({
        workspaceId: ctx.auth.workspaceId,
        userId: ctx.auth.userId
      });

      if (!workspaceMembership) throw errors.notFound("workspaceMembership");

      return `${ctx.auth.workspaceId}`;
    }),
  changes: authenticatedUserProcedure.input(z.void()).subscription(async ({ ctx }) => {
    return createEventSubscription<UserSettingsEvent>(ctx, `userSettings:${ctx.auth.userId}`);
  })
});

export { userSettingsRouter };
export type { UserSettingsEvent };
