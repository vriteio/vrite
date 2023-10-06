import { ObjectId } from "mongodb";
import { z } from "zod";
import { nanoid } from "nanoid";
import {
  contentPieceMember,
  FullWorkspaceMembership,
  getWorkspaceMembershipsCollection,
  workspaceMembership,
  getRolesCollection,
  getUsersCollection,
  getWorkspacesCollection,
  workspace
} from "#database";
import {
  AuthenticatedContext,
  isAuthenticated,
  procedure,
  router,
  isAuthenticatedUser,
  updateSessionUser,
  runWebhooks,
  errors,
  UnderscoreID,
  generateSalt,
  hashValue,
  stringToRegex,
  zodId
} from "#lib";
import { publishWorkspaceMembershipEvent, subscribeToWorkspaceMembershipEvents } from "#events";

const authenticatedProcedure = procedure.use(isAuthenticated);
const authenticatedUserProcedure = procedure.use(isAuthenticatedUser);
const basePath = "/workspace-memberships";
const removeMemberFromWorkspace = async (ctx: AuthenticatedContext, id?: string): Promise<void> => {
  const workspaceMembershipsCollection = getWorkspaceMembershipsCollection(ctx.db);
  const rolesCollection = getRolesCollection(ctx.db);
  const workspaceMembership = await workspaceMembershipsCollection.findOne({
    workspaceId: ctx.auth.workspaceId,
    ...(id ? { _id: new ObjectId(id) } : { userId: ctx.auth.userId })
  });

  if (!workspaceMembership) throw errors.notFound("workspaceMembership");

  const role = await rolesCollection.findOne({
    _id: workspaceMembership.roleId
  });

  if (role?.baseType === "admin") {
    const remainingAdmins = await workspaceMembershipsCollection
      .find({
        workspaceId: ctx.auth.workspaceId,
        roleId: role._id,
        userId: { $exists: true }
      })
      .toArray();

    if (remainingAdmins.length === 1 && remainingAdmins[0]._id.equals(workspaceMembership._id)) {
      throw errors.badRequest("notAllowed");
    }
  }

  await workspaceMembershipsCollection.deleteOne({
    _id: workspaceMembership._id
  });
  await updateSessionUser(ctx, `${workspaceMembership.userId}`);
  publishWorkspaceMembershipEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "delete",
    data: { id: `${workspaceMembership._id}`, userId: `${workspaceMembership.userId}` }
  });
  runWebhooks(ctx, "memberRemoved", {
    ...workspaceMembership,
    id: `${workspaceMembership._id}`,
    userId: `${workspaceMembership.userId}`,
    roleId: `${workspaceMembership.roleId}`
  });
};
const workspaceMembershipsRouter = router({
  update: authenticatedProcedure
    .meta({
      openapi: { method: "PUT", path: basePath, protect: true },
      permissions: { session: ["manageWorkspace"], token: ["workspaceMemberships:write"] }
    })
    .input(
      z.object({
        id: z.string(),
        roleId: zodId()
      })
    )
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const workspaceMembershipsCollection = getWorkspaceMembershipsCollection(ctx.db);
      const rolesCollection = getRolesCollection(ctx.db);
      const membership = await workspaceMembershipsCollection.findOne({
        _id: new ObjectId(input.id),
        workspaceId: ctx.auth.workspaceId
      });

      if (!membership) throw errors.notFound("workspaceMembership");

      const role = await rolesCollection.findOne({
        _id: new ObjectId(input.roleId)
      });

      if (!role) throw errors.notFound("role");

      const currentRole = await rolesCollection.findOne({
        _id: membership.roleId,
        workspaceId: ctx.auth.workspaceId
      });

      if (currentRole?.baseType === "admin") {
        const remainingAdmins = await workspaceMembershipsCollection.countDocuments({
          workspaceId: ctx.auth.workspaceId,
          roleId: currentRole._id,
          userId: { $exists: true }
        });

        if (remainingAdmins === 1) throw errors.badRequest("notAllowed");
      }

      await workspaceMembershipsCollection.updateOne(
        {
          _id: new ObjectId(input.id),
          workspaceId: ctx.auth.workspaceId
        },
        {
          $set: {
            roleId: new ObjectId(input.roleId)
          }
        }
      );
      await updateSessionUser(ctx, `${membership.userId}`);
      publishWorkspaceMembershipEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "update",
        data: {
          id: input.id,
          userId: `${membership.userId}`,
          roleId: `${role._id}`,
          role: {
            id: `${role._id}`,
            name: role.name,
            permissions: role.permissions,
            description: role.description
          }
        }
      });
    }),
  listMembers: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: `${basePath}/list-members`, protect: true },
      permissions: { token: ["workspaceMemberships:read"] }
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
    .output(
      z.array(
        workspaceMembership.extend({
          pendingInvite: z.boolean(),
          profile: z
            .object({
              fullName: z.string(),
              username: z.string(),
              avatar: z.string()
            })
            .partial()
            .optional()
        })
      )
    )
    .query(async ({ ctx, input }) => {
      const workspaceMembershipsCollection = getWorkspaceMembershipsCollection(ctx.db);
      const usersCollection = getUsersCollection(ctx.db);
      const cursor = workspaceMembershipsCollection
        .find({
          workspaceId: ctx.auth.workspaceId,
          ...(input.lastId ? { _id: { $lt: new ObjectId(input.lastId) } } : {})
        })
        .sort("_id", -1);

      if (!input.lastId) {
        cursor.skip((input.page - 1) * input.perPage);
      }

      const workspaceMemberships = await cursor.limit(input.perPage).toArray();
      const users = await usersCollection
        .find({
          _id: {
            $in: workspaceMemberships
              .map((workspaceMembership) => workspaceMembership.userId)
              .filter((value) => value) as ObjectId[]
          }
        })
        .toArray();

      return workspaceMemberships.map((workspaceMembership) => {
        let profile: {
          fullName?: string;
          username?: string;
          avatar?: string;
        } | null = null;

        if (workspaceMembership.userId) {
          const user = users.find(({ _id }) => _id.equals(workspaceMembership.userId!)) || null;

          profile = {
            fullName: user?.fullName,
            username: user?.username,
            avatar: user?.avatar
          };
        }

        return {
          id: `${workspaceMembership._id}`,
          userId: workspaceMembership.userId ? `${workspaceMembership.userId}` : undefined,
          roleId: `${workspaceMembership.roleId}`,
          email: workspaceMembership.email,
          name: workspaceMembership.name,
          pendingInvite: Boolean(workspaceMembership.inviteVerificationCode),
          ...(profile ? { profile } : {})
        };
      });
    }),
  listWorkspaces: authenticatedUserProcedure
    .meta({
      openapi: { method: "GET", path: `${basePath}/list-workspaces`, protect: true },
      permissions: { token: ["workspaceMemberships:read"] }
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
    .output(
      z.array(
        z.object({
          id: zodId(),
          workspace: workspace.omit({ contentGroups: true }),
          role: z.object({ name: z.string(), id: zodId() }).optional()
        })
      )
    )
    .query(async ({ ctx, input }) => {
      const workspaceMembershipsCollection = getWorkspaceMembershipsCollection(ctx.db);
      const workspacesCollection = getWorkspacesCollection(ctx.db);
      const rolesCollection = getRolesCollection(ctx.db);
      const cursor = workspaceMembershipsCollection
        .find({
          userId: ctx.auth.userId,
          ...(input.lastId && { _id: { $lt: new ObjectId(input.lastId) } })
        })
        .sort("_id", -1);

      if (!input.lastId) {
        cursor.skip((input.page - 1) * input.perPage);
      }

      const workspaceMemberships = await cursor.limit(input.perPage).toArray();
      const workspaces = await workspacesCollection
        .find({
          _id: {
            $in: workspaceMemberships.map(({ workspaceId }) => workspaceId)
          }
        })
        .toArray();
      const roles = await rolesCollection
        .find({
          _id: {
            $in: workspaceMemberships.map(({ roleId }) => roleId)
          }
        })
        .toArray();

      return workspaceMemberships.map(({ _id, workspaceId, roleId }) => {
        const workspace = workspaces.find(({ _id }) => {
          return _id.equals(workspaceId);
        });
        const role = roles.find(({ _id }) => {
          return _id.equals(roleId);
        });
        const roleData = {
          id: `${role?._id || ""}`,
          name: `${role?.name || ""}`
        };

        return {
          id: `${_id}`,
          workspace: {
            id: `${workspace?._id || ""}`,
            name: `${workspace?.name || ""}`,
            description: `${workspace?.description || ""}`,
            logo: `${workspace?.logo || ""}`
          },
          ...(role ? { role: roleData } : {})
        };
      });
    }),
  sendInvite: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: basePath, protect: true },
      permissions: { session: ["manageWorkspace"], token: ["workspaceMemberships:write"] }
    })
    .input(
      z.object({
        email: z.string().email().max(320),
        name: z.string(),
        roleId: zodId()
      })
    )
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const workspaceMembershipsCollection = getWorkspaceMembershipsCollection(ctx.db);
      const rolesCollection = getRolesCollection(ctx.db);
      const currentRole = await rolesCollection.findOne({
        _id: new ObjectId(input.roleId),
        workspaceId: ctx.auth.workspaceId
      });

      if (!currentRole) throw errors.notFound("role");

      const inviteVerificationCodeSalt = await generateSalt();
      const inviteVerificationCode = nanoid();
      const workspaceMembership = {
        ...input,
        _id: new ObjectId(),
        workspaceId: ctx.auth.workspaceId,
        roleId: new ObjectId(input.roleId),
        inviteVerificationCode: await hashValue(inviteVerificationCode, inviteVerificationCodeSalt),
        inviteVerificationCodeExpireAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        inviteVerificationCodeSalt
      };

      await workspaceMembershipsCollection.insertOne(workspaceMembership);
      await ctx.fastify.email.sendWorkspaceInvite(input.email, {
        code: inviteVerificationCode,
        workspaceId: `${ctx.auth.workspaceId}`,
        senderUserId: `${ctx.auth.userId}`,
        inviteeName: input.name,
        membershipId: `${workspaceMembership._id}`
      });
      publishWorkspaceMembershipEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "create",
        data: {
          ...input,
          id: `${workspaceMembership._id}`,
          pendingInvite: true
        }
      });
      runWebhooks(ctx, "memberInvited", { ...input, id: `${workspaceMembership._id}` });
    }),
  changes: authenticatedProcedure.subscription(({ ctx }) => {
    return subscribeToWorkspaceMembershipEvents(ctx, `${ctx.auth.workspaceId}`);
  }),
  delete: authenticatedProcedure
    .meta({
      openapi: { method: "DELETE", path: basePath, protect: true },
      permissions: { session: ["manageWorkspace"], token: ["workspaceMemberships:write"] }
    })
    .input(z.object({ id: zodId() }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return removeMemberFromWorkspace(ctx, input.id);
    }),
  leave: authenticatedProcedure
    .input(z.void())
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return removeMemberFromWorkspace(ctx);
    }),

  searchMembers: authenticatedProcedure
    .input(
      z.object({
        query: z.string().optional()
      })
    )
    .output(z.array(contentPieceMember))
    .query(async ({ ctx, input }) => {
      const workspaceMembershipCollection = getWorkspaceMembershipsCollection(ctx.db);
      const usersCollection = getUsersCollection(ctx.db);
      const allMemberships = await workspaceMembershipCollection
        .find({
          workspaceId: ctx.auth.workspaceId
        })
        .toArray();
      const users = await usersCollection
        .find({
          _id: {
            $in: allMemberships.map(({ userId }) => userId).filter(Boolean) as ObjectId[]
          },
          ...(input.query ? { username: stringToRegex(input.query.toLowerCase()) } : {})
        })
        .limit(10)
        .sort("_id", -1)
        .toArray();
      const memberships = users
        .map((user) => {
          return allMemberships.find(({ userId }) => userId?.equals(user._id));
        })
        .filter(Boolean) as Array<UnderscoreID<FullWorkspaceMembership<ObjectId>>>;

      return memberships.map((membership) => {
        const user = users.find(({ _id }) => _id.equals(membership.userId!))!;

        return {
          id: `${membership._id}`,
          profile: {
            id: `${user._id}`,
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            avatar: user.avatar
          }
        };
      });
    }),
  get: authenticatedProcedure
    .input(z.object({ userId: zodId() }).or(z.void()))
    .output(workspaceMembership)
    .query(async ({ ctx, input }) => {
      const workspaceMembershipCollection = getWorkspaceMembershipsCollection(ctx.db);
      const usersCollection = getUsersCollection(ctx.db);
      const workspaceMembership = await workspaceMembershipCollection.findOne({
        workspaceId: ctx.auth.workspaceId,
        userId: new ObjectId(input?.userId || ctx.auth.userId)
      });

      if (!workspaceMembership) throw errors.notFound("membership");

      const user = await usersCollection.findOne({ _id: workspaceMembership.userId });

      if (!user) throw errors.notFound("user");

      return {
        id: `${workspaceMembership._id}`,
        workspaceId: `${workspaceMembership.workspaceId}`,
        userId: `${workspaceMembership.userId}`,
        roleId: `${workspaceMembership.roleId}`
      };
    })
});

export { workspaceMembershipsRouter };
