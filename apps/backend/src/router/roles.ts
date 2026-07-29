import { permissionType } from "#backend/db";
import { roleType } from "#backend/db";
import { emitRoleEvent } from "#backend/events";
import { authorized } from "#backend/lib/middleware";
import { id } from "#backend/lib/id";
import { base } from "#backend/lib/orpc";
import { Roles } from "#backend/services/roles";
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
    .handler(async ({ context, input }) => {
      const newRole = await Roles.create({
        workspaceID: context.auth.workspaceID,
        name: input.name,
        permissions: input.permissions
      });

      emitRoleEvent(context.auth.workspaceID, {
        action: "role:create",
        memberID: context.auth.session?.memberID,
        data: newRole
      });

      return newRole;
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
        id: id().describe("ID of the role to update"),
        name: z.string().min(1).max(50).optional().describe("New name for the role"),
        permissions: z.array(permissionType).optional().describe("New permissions for the role")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      await Roles.update({
        id: input.id,
        workspaceID: context.auth.workspaceID,
        name: input.name,
        permissions: input.permissions
      });

      emitRoleEvent(context.auth.workspaceID, {
        action: "role:update",
        memberID: context.auth.session?.memberID,
        data: {
          id: input.id,
          ...(input.name !== undefined && { name: input.name }),
          ...(input.permissions !== undefined && { permissions: input.permissions })
        }
      });
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
        id: id().describe("ID of the role to delete")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      await Roles.delete({
        id: input.id,
        workspaceID: context.auth.workspaceID
      });

      emitRoleEvent(context.auth.workspaceID, {
        action: "role:delete",
        memberID: context.auth.session?.memberID,
        data: {
          id: input.id
        }
      });
    })
});

export { rolesRouter };
