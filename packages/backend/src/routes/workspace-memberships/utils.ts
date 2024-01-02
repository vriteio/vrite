import { ObjectId } from "mongodb";
import { getWorkspaceMembershipsCollection, getRolesCollection } from "#collections";
import { publishWorkspaceMembershipEvent } from "#events";
import { errors } from "#lib/errors";
import { AuthenticatedContext } from "#lib/middleware";
import { updateSessionUser } from "#lib/session";

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

export { removeMemberFromWorkspace };
