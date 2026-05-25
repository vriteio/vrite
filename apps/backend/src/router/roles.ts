import { permissionType } from "#backend/db";
import { roleType } from "#backend/db";
import { emitRoleEvent } from "#backend/events";
import { authorized } from "#backend/lib/middleware";
import { objectID } from "#backend/lib/mongo";
import { base } from "#backend/lib/orpc";
import { Roles } from "#backend/services/roles";
import { ORPCError } from "@orpc/server";
import * as z from "zod";

const rolesRouter = base.prefix("/roles").router({
  list: base
    .route({
      method: "GET",
      path: "/"
    })
    .meta({
      required: {
        session: ["content"],
        key: ["read:roles"]
      }
    })
    .use(authorized)
    .output(z.array(roleType))
    .handler(({ context }) => {
      return Roles.list({
        workspaceID: context.auth.workspaceID
      });
    }),
  create: base
    .route({
      method: "POST",
      path: "/"
    })
    .meta({
      required: {
        session: ["workspace"],
        key: ["roles"]
      }
    })
    .use(authorized)
    .input(
      z.object({
        name: z.string().min(1).max(50).describe("Name of the role"),
        permissions: z.array(permissionType).describe("Permissions to grant to the role")
      })
    )
    .output(roleType)
    .handler(({ context, input }) => {
      const result = Roles.create({
        workspaceID: context.auth.workspaceID,
        name: input.name,
        permissions: input.permissions
      });

      void result.then((role) => {
        void emitRoleEvent(context.auth.workspaceID, {
          action: "role:create",
          memberID: context.auth.session?.memberID,
          data: role
        });
      });

      return result;
    }),
  update: base
    .route({
      method: "PUT",
      path: "/:id"
    })
    .meta({
      required: {
        session: ["workspace"],
        key: ["roles"]
      }
    })
    .use(authorized)
    .input(
      z.object({
        id: objectID().describe("ID of the role to update"),
        name: z.string().min(1).max(50).optional().describe("New name for the role"),
        permissions: z.array(permissionType).optional().describe("New permissions for the role")
      })
    )
    .output(z.void())
    .handler(({ context, input }) => {
      const result = Roles.update({
        id: input.id,
        workspaceID: context.auth.workspaceID,
        name: input.name,
        permissions: input.permissions
      });

      void result.then(() => {
        void emitRoleEvent(context.auth.workspaceID, {
          action: "role:update",
          memberID: context.auth.session?.memberID,
          data: {
            id: input.id,
            ...(input.name !== undefined && { name: input.name }),
            ...(input.permissions !== undefined && { permissions: input.permissions })
          }
        });
      });

      return result;
    }),
  delete: base
    .route({
      method: "DELETE",
      path: "/:id"
    })
    .meta({
      required: {
        session: ["workspace"],
        key: ["roles"]
      }
    })
    .use(authorized)
    .input(
      z.object({
        id: objectID().describe("ID of the role to delete")
      })
    )
    .output(z.void())
    .handler(({ context, input }) => {
      const result = Roles.delete({
        id: input.id,
        workspaceID: context.auth.workspaceID
      });

      void result.then(() => {
        void emitRoleEvent(context.auth.workspaceID, {
          action: "role:delete",
          memberID: context.auth.session?.memberID,
          data: {
            id: input.id
          }
        });
      });

      return result;
    })
});

export { rolesRouter };
