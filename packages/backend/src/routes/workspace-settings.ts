import { procedure, router } from "../lib/trpc";
import { isAuthenticated } from "../lib/middleware";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import { ObjectId } from "mongodb";
import {
  FullWorkspaceSettings,
  WorkspaceSettings,
  getWorkspaceSettingsCollection,
  prettierConfig,
  workspaceSettings
} from "#database/workspace-settings";
import * as errors from "#lib/errors";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";

type WorkspaceSettingsEvent = {
  action: "update";
  data: Partial<Omit<WorkspaceSettings, "id">>;
};

const publishEvent = createEventPublisher<WorkspaceSettingsEvent>((workspaceId) => {
  return `workspaceSettings:${workspaceId}`;
});
const authenticatedProcedure = procedure.use(isAuthenticated);
const basePath = "/workspace-settings";
const workspaceSettingsRouter = router({
  get: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: basePath, protect: true },
      permissions: { token: ["workspace:read"] }
    })
    .input(z.void())
    .output(workspaceSettings)
    .query(async ({ ctx }) => {
      const workspaceSettingsCollection = getWorkspaceSettingsCollection(ctx.db);
      const workspaceSettings = await workspaceSettingsCollection.findOne({
        workspaceId: ctx.auth.workspaceId
      });

      if (!workspaceSettings) {
        throw errors.notFound("workspaceSettings");
      }

      return {
        id: `${workspaceSettings._id}`,
        prettierConfig: workspaceSettings.prettierConfig,
        metadata: workspaceSettings.metadata,
        marks: workspaceSettings.marks,
        blocks: workspaceSettings.blocks,
        embeds: workspaceSettings.embeds
      };
    }),
  changes: authenticatedProcedure.input(z.void()).subscription(({ ctx }) => {
    return createEventSubscription<WorkspaceSettingsEvent>(
      ctx,
      `workspaceSettings:${ctx.auth.workspaceId}`
    );
  }),
  update: authenticatedProcedure
    .meta({
      openapi: { method: "PUT", path: basePath, protect: true },
      permissions: { session: ["manageWorkspace"], token: ["workspace:write"] }
    })
    .input(
      workspaceSettings
        .partial()
        .omit({ id: true, prettierConfig: true })
        .extend({ prettierConfig: z.string().optional() })
    )
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const workspaceSettingsCollection = getWorkspaceSettingsCollection(ctx.db);
      const { prettierConfig, ...update } = input;
      const workspaceSettingsUpdate = update as Partial<FullWorkspaceSettings<ObjectId>>;

      if (prettierConfig) {
        try {
          JSON.parse(prettierConfig);
        } catch (error) {
          throw errors.invalid("prettierConfig");
        }

        workspaceSettingsUpdate.prettierConfig = input.prettierConfig;
      }

      const { matchedCount } = await workspaceSettingsCollection.updateOne(
        { workspaceId: ctx.auth.workspaceId },
        {
          $set: workspaceSettingsUpdate
        }
      );

      if (!matchedCount) throw errors.notFound("workspaceSettings");

      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "update",
        data: input
      });
    }),
  prettierSchema: procedure
    .meta({ openapi: { method: "GET", path: `${basePath}/schemas/prettier` } })
    .input(z.void())
    .output(z.any())
    .query(() => {
      return zodToJsonSchema(prettierConfig);
    })
});

export { workspaceSettingsRouter, publishEvent as publishWorkspaceSettingsEvent };
