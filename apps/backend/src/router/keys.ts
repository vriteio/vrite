import { keyPermissionType, keyType } from "#backend/db";
import { emitKeyEvent } from "#backend/events";
import { base, sessionRoute } from "#backend/lib/transport";
import { id } from "#backend/lib/primitives";
import { Keys } from "#backend/services/keys";
import { Auth } from "#backend/services/auth";
import { ORPCError } from "@orpc/server";
import * as z from "zod";

const keyWithRawKeyType = keyType.extend({
  rawKey: z.string().describe("The full raw API key value")
});

const keysRouter = base.prefix("/keys").router({
  create: sessionRoute
    .input(
      z.object({
        name: z.string().min(1).max(100).describe("Name for the API key"),
        permissions: z.array(keyPermissionType).describe("Permissions to grant to the API key")
      })
    )
    .output(keyWithRawKeyType)
    .handler(async ({ context, input }) => {
      if (!context.auth.session) {
        throw new ORPCError("FORBIDDEN", {
          message: "Session authentication is required to create an API key"
        });
      }

      const key = await Keys.create({
        auth: context.auth,
        name: input.name,
        permissions: input.permissions
      });

      const { rawKey: _rawKey, ...safeKey } = key;

      emitKeyEvent(context.auth.workspaceID, {
        action: "key:create",
        memberID: context.auth.session.memberID,
        data: safeKey
      });

      return key;
    }),
  get: sessionRoute
    .input(
      z.object({
        id: id().describe("ID of the API key to retrieve")
      })
    )
    .output(keyType)
    .handler(({ context, input }) => {
      return Keys.get({
        keyID: input.id,
        auth: context.auth
      });
    }),
  list: sessionRoute.output(z.array(keyType)).handler(async ({ context }) => {
    const { keys } = await Keys.list({
      auth: context.auth
    });

    return keys;
  }),
  delete: sessionRoute
    .input(
      z.object({
        ids: z.array(id()).describe("IDs of the API keys to delete")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      await Keys.delete({
        ids: input.ids,
        auth: context.auth
      });
      await Promise.all(input.ids.map((keyID) => Auth.invalidateSessionData({ keyID })));

      emitKeyEvent(context.auth.workspaceID, {
        action: "key:delete",
        memberID: context.auth.session?.memberID,
        data: {
          ids: input.ids
        }
      });
    }),
  update: sessionRoute
    .input(
      z.object({
        id: id().describe("ID of the API key to update"),
        name: z.string().min(1).max(100).optional().describe("New name for the API key"),
        permissions: z
          .array(keyPermissionType)
          .optional()
          .describe("New permissions for the API key")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      await Keys.update({
        id: input.id,
        auth: context.auth,
        name: input.name,
        permissions: input.permissions
      });

      if (input.permissions !== undefined) {
        await Auth.invalidateSessionData({ keyID: input.id });
      }

      emitKeyEvent(context.auth.workspaceID, {
        action: "key:update",
        memberID: context.auth.session?.memberID,
        data: {
          id: input.id,
          ...(input.name !== undefined && { name: input.name }),
          ...(input.permissions !== undefined && { permissions: input.permissions })
        }
      });
    }),
  rotate: sessionRoute
    .input(
      z.object({
        id: id().describe("ID of the API key to rotate"),
        expiresIn: z.enum(["now", "1h", "24h", "7d"]).describe("When the old key should expire")
      })
    )
    .output(keyWithRawKeyType)
    .handler(async ({ context, input }) => {
      if (!context.auth.session) {
        throw new ORPCError("FORBIDDEN", {
          message: "Session authentication is required to rotate an API key"
        });
      }

      const key = await Keys.rotate({
        id: input.id,
        auth: context.auth,
        expiresIn: input.expiresIn
      });

      await Auth.invalidateSessionData({ keyID: input.id });

      const { rawKey: _rawKey, ...safeKey } = key;

      emitKeyEvent(context.auth.workspaceID, {
        action: "key:rotate",
        memberID: context.auth.session.memberID,
        data: {
          previousKeyID: input.id,
          key: safeKey
        }
      });

      return key;
    })
});

export { keysRouter };
