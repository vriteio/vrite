import { z } from "zod";
import { ObjectId } from "mongodb";
import { procedure, router } from "#lib/trpc";
import { isAuthenticated } from "#lib/middleware";
import { zodId } from "#lib/mongo";
import {
  Role,
  baseRoleType,
  getRolesCollection,
  role,
  getWorkspaceMembershipsCollection,
  getUsersCollection
} from "#database";
import * as errors from "#lib/errors";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";
import { updateSessionRole } from "#lib/session";

type RoleEvent =
  | {
      action: "create";
      data: Role;
    }
  | { action: "update"; data: Partial<Role> & { id: string } }
  | { action: "delete"; data: { id: string; newRole: Role } };

const publishEvent = createEventPublisher((workspaceId) => `roles:${workspaceId}`);
const basePath = "/roles";
const authenticatedProcedure = procedure.use(isAuthenticated);
const rolesRouter = router({
  list: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: `${basePath}/list`, protect: true },
      permissions: { token: ["roles:read"] }
    })
    .input(
      z
        .object({
          perPage: z.number().default(20),
          page: z.number().default(1),
          lastId: zodId().optional()
        })
        .default({})
    )
    .output(z.array(role.extend({ baseType: baseRoleType.optional() })))
    .query(async ({ ctx, input }) => {
      const rolesCollection = getRolesCollection(ctx.db);
      const cursor = rolesCollection
        .find({
          workspaceId: ctx.auth.workspaceId,
          ...(input.lastId && { _id: { $lt: new ObjectId(input.lastId) } })
        })
        .sort({ _id: -1 });

      if (!input.lastId) {
        cursor.skip((input.page - 1) * input.perPage);
      }

      const roles = await cursor.limit(input.perPage).toArray();

      return roles.map(({ _id, workspaceId, ...role }) => ({
        id: `${_id}`,
        ...role
      }));
    }),
  changes: authenticatedProcedure.input(z.void()).subscription(({ ctx }) => {
    return createEventSubscription<RoleEvent>(ctx, `roles:${ctx.auth.workspaceId}`);
  }),
  get: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: basePath, protect: true },
      permissions: { token: ["roles:read"] }
    })
    .input(z.object({ id: zodId().optional() }).default({}))
    .output(role.extend({ id: zodId(), baseType: baseRoleType.optional() }))
    .query(async ({ ctx, input }) => {
      const rolesCollection = getRolesCollection(ctx.db);
      const membershipsCollection = getWorkspaceMembershipsCollection(ctx.db);

      let roleId = input.id ? new ObjectId(input.id) : undefined;

      if (!roleId) {
        const membership = await membershipsCollection.findOne({
          workspaceId: ctx.auth.workspaceId,
          userId: ctx.auth.userId
        });

        if (!membership) {
          throw errors.notFound("role");
        }

        roleId = membership.roleId || roleId;
      }

      const role = await rolesCollection.findOne({
        workspaceId: ctx.auth.workspaceId,
        _id: roleId
      });

      if (!role) {
        throw errors.notFound("role");
      }

      return {
        id: `${role._id}`,
        ...role
      };
    }),
  update: authenticatedProcedure
    .meta({
      openapi: { method: "PUT", path: basePath, protect: true },
      permissions: { session: ["manageWorkspace"], token: ["roles:write"] }
    })
    .input(role.partial().required({ id: true }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const rolesCollection = getRolesCollection(ctx.db);
      const role = await rolesCollection.findOne({
        _id: new ObjectId(input.id),
        workspaceId: ctx.auth.workspaceId
      });

      if (!role) throw errors.notFound("role");
      if (role.baseType) throw errors.locked("role", { baseType: role.baseType });

      await rolesCollection.updateOne(
        {
          _id: new ObjectId(input.id),
          workspaceId: ctx.auth.workspaceId
        },
        {
          $set: {
            name: input.name,
            description: input.description,
            permissions: input.permissions
          }
        }
      );
      updateSessionRole(ctx, input.id);
      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "update",
        data: {
          ...input
        }
      });
    }),
  create: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: basePath, protect: true },
      permissions: { session: ["manageWorkspace"], token: ["roles:write"] }
    })
    .input(role.omit({ id: true }))
    .output(z.object({ id: zodId() }))
    .mutation(async ({ ctx, input }) => {
      const rolesCollection = getRolesCollection(ctx.db);
      const role = {
        _id: new ObjectId(),
        workspaceId: ctx.auth.workspaceId,
        name: input.name,
        description: input.description,
        permissions: input.permissions
      };

      await rolesCollection.insertOne(role);
      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "create",
        data: {
          ...input,
          id: `${role._id}`
        }
      });

      return { id: `${role._id}` };
    }),
  delete: authenticatedProcedure
    .meta({
      openapi: { method: "DELETE", path: basePath, protect: true },
      permissions: { session: ["manageWorkspace"], token: ["roles:write"] }
    })
    .input(z.object({ id: zodId() }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const rolesCollection = getRolesCollection(ctx.db);
      const usersCollection = getUsersCollection(ctx.db);
      const role = await rolesCollection.findOne({
        _id: new ObjectId(input.id),
        workspaceId: ctx.auth.workspaceId
      });

      if (!role) throw errors.notFound("role");
      if (role.baseType) throw errors.locked("role", { baseType: role.baseType });

      const viewerRole = await rolesCollection.findOne({
        workspaceId: ctx.auth.workspaceId,
        baseType: "viewer"
      });

      if (!viewerRole) throw errors.notFound("role");

      await rolesCollection.deleteOne({
        _id: new ObjectId(input.id),
        workspaceId: ctx.auth.workspaceId
      });
      await usersCollection.updateMany(
        {
          workspaceId: ctx.auth.workspaceId,
          roleId: new ObjectId(input.id)
        },
        {
          $set: {
            roleId: viewerRole?._id
          }
        }
      );
      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "delete",
        data: {
          id: input.id,
          newRole: {
            permissions: viewerRole.permissions,
            name: viewerRole.name,
            description: viewerRole.description,
            id: `${viewerRole._id}`
          }
        }
      });
    })
});

export { rolesRouter };
