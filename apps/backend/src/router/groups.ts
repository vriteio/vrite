import { groupType } from "#backend/db";
import { emitGroupEvent } from "#backend/events";
import { id } from "#backend/lib/primitives";
import { authorized, base } from "#backend/lib/transport";
import { Groups } from "#backend/services/groups";
import * as z from "zod";

const groupDetailsType = groupType.extend({
  invitationIDs: z.array(id()).describe("IDs of pending invitations assigned to the group"),
  memberIDs: z.array(id()).describe("IDs of active memberships assigned to the group")
});

const groupsRouter = base.prefix("/groups").router({
  list: base
    .route({ method: "GET", path: "/" })
    .meta({
      requireProPlan: true,
      required: { session: ["workspace"] }
    })
    .use(authorized)
    .output(z.array(groupDetailsType))
    .handler(async ({ context }) => {
      const { groups } = await Groups.list({ workspaceID: context.auth.workspaceID });

      return groups;
    }),
  create: base
    .route({ method: "POST", path: "/" })
    .meta({
      requireProPlan: true,
      required: { session: ["workspace"] }
    })
    .use(authorized)
    .input(groupDetailsType.omit({ id: true }))
    .output(groupDetailsType)
    .handler(async ({ context, input }) => {
      const { affectedUserIDs: _, ...group } = await Groups.create({
        invitationIDs: input.invitationIDs,
        memberIDs: input.memberIDs,
        name: input.name,
        workspaceID: context.auth.workspaceID
      });

      emitGroupEvent(context.auth.workspaceID, {
        action: "group:create",
        memberID: context.auth.session?.memberID,
        data: group
      });

      return group;
    }),
  update: base
    .route({ method: "PATCH", path: "/:id" })
    .meta({
      requireProPlan: true,
      required: { session: ["workspace"] }
    })
    .use(authorized)
    .input(groupDetailsType)
    .output(z.void())
    .handler(async ({ context, input }) => {
      const { affectedUserIDs, invitationIDs, memberIDs, name } = await Groups.update({
        id: input.id,
        invitationIDs: input.invitationIDs,
        memberIDs: input.memberIDs,
        name: input.name,
        workspaceID: context.auth.workspaceID
      });

      emitGroupEvent(context.auth.workspaceID, {
        action: "group:update",
        affectedUserIDs,
        memberID: context.auth.session?.memberID,
        data: { id: input.id, invitationIDs, memberIDs, name }
      });
    }),
  delete: base
    .route({ method: "DELETE", path: "/:id" })
    .meta({
      requireProPlan: true,
      required: { session: ["workspace"] }
    })
    .use(authorized)
    .input(z.object({ id: groupType.shape.id }))
    .output(z.void())
    .handler(async ({ context, input }) => {
      const { affectedUserIDs } = await Groups.delete({
        id: input.id,
        workspaceID: context.auth.workspaceID
      });

      emitGroupEvent(context.auth.workspaceID, {
        action: "group:delete",
        affectedUserIDs,
        memberID: context.auth.session?.memberID,
        data: { id: input.id }
      });
    })
});

export { groupsRouter };
