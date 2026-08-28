import { groupType } from "#backend/db";
import { emitGroupEvent } from "#backend/events";
import { id } from "#backend/lib/primitives";
import { base, sessionRoute } from "#backend/lib/transport";
import { Groups } from "#backend/services/groups";
import * as z from "zod";

const groupDetailsType = groupType.extend({
  invitationIDs: z.array(id()).describe("IDs of pending invitations assigned to the group"),
  memberIDs: z.array(id()).describe("IDs of active memberships assigned to the group")
});

const groupsRouter = base.prefix("/groups").router({
  list: sessionRoute
    .route({ method: "GET", path: "/" })
    .output(z.array(groupDetailsType))
    .handler(async ({ context }) => {
      const { groups } = await Groups.list({ auth: context.auth });

      return groups;
    }),
  create: sessionRoute
    .route({ method: "POST", path: "/" })
    .input(groupDetailsType.omit({ id: true }))
    .output(groupDetailsType)
    .handler(async ({ context, input }) => {
      const { affectedUserIDs: _, ...group } = await Groups.create({
        invitationIDs: input.invitationIDs,
        auth: context.auth,
        memberIDs: input.memberIDs,
        name: input.name
      });

      emitGroupEvent(context.auth.workspaceID, {
        action: "group:create",
        memberID: context.auth.session?.memberID,
        data: group
      });

      return group;
    }),
  update: sessionRoute
    .route({ method: "PATCH", path: "/:id" })
    .input(groupDetailsType)
    .output(z.void())
    .handler(async ({ context, input }) => {
      const { affectedUserIDs, invitationIDs, memberIDs, name } = await Groups.update({
        id: input.id,
        auth: context.auth,
        invitationIDs: input.invitationIDs,
        memberIDs: input.memberIDs,
        name: input.name
      });

      emitGroupEvent(context.auth.workspaceID, {
        action: "group:update",
        affectedUserIDs,
        memberID: context.auth.session?.memberID,
        data: { id: input.id, invitationIDs, memberIDs, name }
      });
    }),
  delete: sessionRoute
    .route({ method: "DELETE", path: "/:id" })
    .input(z.object({ id: groupType.shape.id }))
    .output(z.void())
    .handler(async ({ context, input }) => {
      const { affectedUserIDs } = await Groups.delete({
        id: input.id,
        auth: context.auth
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
