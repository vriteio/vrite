import { emitGroupEvent, emitMembershipEvent } from "#backend/events";
import { inviteType, membershipType, userProfileType } from "#backend/db";
import { authenticatedRoute, base, sessionRoute } from "#backend/lib/transport";
import { id } from "#backend/lib/primitives";
import { Billing } from "#backend/services/billing";
import { Memberships } from "#backend/services/memberships";
import { Auth } from "#backend/services/auth";
import { ORPCError } from "@orpc/server";
import * as z from "zod";

const memberDetailsType = membershipType.extend({
  roleName: z.string().optional().describe("Name of the member's assigned role"),
  admin: z.boolean().optional().describe("Whether the member is an admin"),
  profile: userProfileType.describe("Public profile information for the member")
});
const inviteDetailsType = inviteType.extend({
  inviteLink: z.url().describe("Signed URL for accepting the invitation"),
  workspaceID: id().describe("ID of the workspace the invite belongs to")
});
const membershipInviteResultType = z.object({
  inviteID: inviteType.shape.id,
  inviteLink: z.string().url().describe("Invite link that can be shared manually"),
  emailDelivery: z
    .enum(["sent", "manual", "failed"])
    .describe("Whether the invite email was sent, must be shared manually, or failed")
});
const inviteDeliveryResultType = z.object({
  emailDelivery: z
    .enum(["sent", "manual", "failed"])
    .describe("Whether the invitation email was sent, must be shared manually, or failed")
});
const acceptedInviteType = z.object({
  workspaceID: id().describe("ID of the workspace that was joined"),
  workspaceName: z.string().describe("Name of the workspace that was joined")
});
const emitUpdatedGroups = (input: {
  groups: Array<{ id: string; invitationIDs: string[]; memberIDs: string[] }>;
  memberID?: string;
  workspaceID: string;
}): void => {
  for (const group of input.groups) {
    emitGroupEvent(input.workspaceID, {
      action: "group:members-update",
      memberID: input.memberID,
      data: {
        id: group.id,
        invitationIDs: group.invitationIDs,
        memberIDs: group.memberIDs
      }
    });
  }
};

const membershipsRouter = base.prefix("/memberships").router({
  list: authenticatedRoute
    .route({ method: "GET", path: "/" })
    .output(z.array(memberDetailsType))
    .handler(async ({ context }) => {
      const { members } = await Memberships.list({
        auth: context.auth
      });

      return members;
    }),
  update: authenticatedRoute
    .route({ method: "PATCH", path: "/:id" })
    .input(
      z.object({
        id: id().describe("ID of the membership to update"),
        roleID: id().describe("New role ID")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      const { userID } = await Memberships.update({
        id: input.id,
        auth: context.auth,
        roleID: input.roleID
      });

      await Auth.invalidateSessionData({
        userID,
        workspaceID: context.auth.workspaceID
      });

      emitMembershipEvent(context.auth.workspaceID, {
        action: "membership:update",
        memberID: context.auth.session?.memberID,
        data: {
          id: input.id,
          roleID: input.roleID
        }
      });
    }),
  remove: authenticatedRoute
    .route({ method: "DELETE", path: "/:id" })
    .input(
      z.object({
        id: id().describe("ID of the membership to remove")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      const { userID } = await Memberships.remove({
        id: input.id,
        auth: context.auth
      });

      await Auth.invalidateSessionData({
        userID,
        workspaceID: context.auth.workspaceID
      });

      emitMembershipEvent(context.auth.workspaceID, {
        action: "membership:remove",
        memberID: context.auth.session?.memberID,
        data: {
          id: input.id
        }
      });

      await Billing.updateSeats({ workspaceID: context.auth.workspaceID });
    }),
  invite: authenticatedRoute
    .route({ method: "POST", path: "/" })
    .input(
      z.object({
        email: z.email().describe("Email address of the user to invite"),
        roleID: id().describe("ID of the role to assign")
      })
    )
    .output(membershipInviteResultType)
    .handler(async ({ context, input }) => {
      const newInviteDetails = await Memberships.invite({
        auth: context.auth,
        email: input.email,
        roleID: input.roleID
      });

      emitMembershipEvent(context.auth.workspaceID, {
        action: "invite:create",
        memberID: context.auth.session?.memberID,
        data: newInviteDetails.invite
      });

      return newInviteDetails;
    }),
  listInvites: authenticatedRoute
    .route({ method: "GET", path: "/invites" })
    .output(z.array(inviteDetailsType))
    .handler(async ({ context }) => {
      const { invites } = await Memberships.listInvites({
        auth: context.auth
      });

      return invites;
    }),
  resendInvite: authenticatedRoute
    .route({ method: "POST", path: "/invites/:id/resend" })
    .input(
      z.object({
        id: id().describe("ID of the pending invitation")
      })
    )
    .output(inviteDeliveryResultType)
    .handler(async ({ context, input }) => {
      const { emailDelivery } = await Memberships.resendInvite({
        id: input.id,
        auth: context.auth
      });

      return { emailDelivery };
    }),
  revokeInvite: authenticatedRoute
    .route({ method: "DELETE", path: "/invites/:id" })
    .input(
      z.object({
        id: id().describe("ID of the invite to revoke")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      const { updatedGroups } = await Memberships.revokeInvite({
        id: input.id,
        auth: context.auth
      });

      emitMembershipEvent(context.auth.workspaceID, {
        action: "invite:revoke",
        memberID: context.auth.session?.memberID,
        data: {
          id: input.id
        }
      });
      emitUpdatedGroups({
        groups: updatedGroups,
        memberID: context.auth.session?.memberID,
        workspaceID: context.auth.workspaceID
      });
    }),
  acceptInvite: sessionRoute
    .route({
      method: "POST",
      path: "/accept"
    })
    .meta({ requireWorkspace: false })
    .input(
      z.object({
        id: id().describe("ID of the invitation"),
        expires: z.number().int().positive().describe("Signed URL expiration time"),
        signature: z.string().length(64).describe("HMAC signature for the invitation URL")
      })
    )
    .output(acceptedInviteType)
    .handler(async ({ context, input }) => {
      if (!context.auth.session) {
        throw new ORPCError("FORBIDDEN", {
          message: "User must be authenticated to accept an invite"
        });
      }

      const result = await Memberships.acceptInvite({
        id: input.id,
        expires: input.expires,
        signature: input.signature,
        userID: context.auth.session.userID
      });

      await Auth.invalidateSessionData({
        userID: context.auth.session.userID,
        workspaceID: result.workspaceID
      });
      await Billing.updateSeats({ workspaceID: result.workspaceID });

      emitMembershipEvent(result.workspaceID, {
        action: "membership:add",
        data: result.membership
      });
      emitUpdatedGroups({
        groups: result.updatedGroups,
        workspaceID: result.workspaceID
      });

      return {
        workspaceID: result.workspaceID,
        workspaceName: result.workspaceName
      };
    })
});

export { membershipsRouter };
