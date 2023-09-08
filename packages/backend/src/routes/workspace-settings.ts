import { procedure, router } from "../lib/trpc";
import { isAuthenticated } from "../lib/middleware";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import { ObjectId } from "mongodb";
import {
  FullWorkspaceSettings,
  WorkspaceSettings,
  wrapper,
  getWorkspaceSettingsCollection,
  prettierConfig,
  workspaceSettings,
  Wrapper
} from "#database/workspace-settings";
import * as errors from "#lib/errors";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";

type WorkspaceSettingsEvent =
  | {
      action: "update";
      data: Partial<Omit<WorkspaceSettings, "id">>;
    }
  | {
      action: "createWrapper";
      data: Wrapper;
    }
  | {
      action: "deleteWrapper";
      data: Pick<Wrapper, "key">;
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
        embeds: workspaceSettings.embeds,
        wrappers: workspaceSettings.wrappers || []
      };
    }),
  createWrapper: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: `${basePath}/wrapper`, protect: true },
      permissions: { session: ["manageWorkspace"], token: ["workspace:write"] }
    })
    .input(wrapper)
    .output(z.object({ key: wrapper.shape.key }))
    .mutation(async ({ input, ctx }) => {
      const extensionId = ctx.req.headers["x-vrite-extension-id"] as string | undefined;
      const workspaceSettingsCollection = getWorkspaceSettingsCollection(ctx.db);
      const workspaceSettings = await workspaceSettingsCollection.findOne({
        workspaceId: ctx.auth.workspaceId
      });

      if (!workspaceSettings) throw errors.notFound("workspaceSettings");

      const sameKeyWrapperIndex =
        workspaceSettings.wrappers?.findIndex((wrapper) => wrapper.key === input.key) || -1;

      if (sameKeyWrapperIndex >= 0) {
        await workspaceSettingsCollection.updateOne(
          {
            workspaceId: ctx.auth.workspaceId
          },
          {
            $set: {
              wrappers: (workspaceSettings.wrappers || []).map((item, index) => {
                if (index === sameKeyWrapperIndex) {
                  return {
                    ...item,
                    ...input,
                    ...(extensionId && { extension: item.extension || true })
                  };
                }

                return item;
              })
            }
          }
        );
      } else {
        await workspaceSettingsCollection.updateOne(
          {
            workspaceId: ctx.auth.workspaceId
          },
          {
            $push: {
              wrappers: {
                ...input,
                ...(extensionId && { extension: true })
              }
            }
          }
        );
      }

      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "createWrapper",
        data: input
      });

      return {
        key: input.key
      };
    }),
  deleteWrapper: authenticatedProcedure
    .meta({
      openapi: { method: "DELETE", path: `${basePath}/wrapper`, protect: true },
      permissions: { session: ["manageWorkspace"], token: ["workspace:write"] }
    })
    .input(wrapper.pick({ key: true }))
    .output(z.void())
    .mutation(async ({ input, ctx }) => {
      const workspaceSettingsCollection = getWorkspaceSettingsCollection(ctx.db);

      await workspaceSettingsCollection.updateOne(
        {
          workspaceId: ctx.auth.workspaceId
        },
        {
          $pull: {
            wrappers: {
              key: input.key
            }
          }
        }
      );
      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "deleteWrapper",
        data: input
      });
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
        .omit({ id: true, prettierConfig: true, wrappers: true })
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
