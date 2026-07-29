import { emitMembershipEvent } from "#backend/events";
import { inviteType, membershipType, userProfileType } from "#backend/db";
import { authorized } from "#backend/lib/middleware";
import { id } from "#backend/lib/id";
import { base } from "#backend/lib/orpc";
import { Memberships } from "#backend/services/memberships";
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

const membershipsRouter = base.prefix("/memberships").router({
  list: base
    .route({
      method: "GET",
      path: "/"
    })
    .meta({
      required: {
        session: ["content"],
        key: ["read:memberships"]
      }
    })
    .use(authorized)
    .output(z.array(memberDetailsType))
    .handler(({ context }) => {
      return Memberships.list({
        workspaceID: context.auth.workspaceID
      });
    }),
  update: base
    .route({
      method: "PATCH",
      path: "/:id"
    })
    .meta({
      required: {
        session: ["workspace"],
        key: ["memberships"]
      }
    })
    .use(authorized)
    .input(
      z.object({
        id: id().describe("ID of the membership to update"),
        roleID: id().describe("New role ID")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      await Memberships.update({
        id: input.id,
        workspaceID: context.auth.workspaceID,
        roleID: input.roleID
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
  remove: base
    .route({
      method: "DELETE",
      path: "/:id"
    })
    .meta({
      required: {
        session: ["workspace"],
        key: ["memberships"]
      }
    })
    .use(authorized)
    .input(
      z.object({
        id: id().describe("ID of the membership to remove")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      await Memberships.remove({
        id: input.id,
        workspaceID: context.auth.workspaceID
      });

      emitMembershipEvent(context.auth.workspaceID, {
        action: "membership:remove",
        memberID: context.auth.session?.memberID,
        data: {
          id: input.id
        }
      });
    }),
  invite: base
    .route({
      method: "POST",
      path: "/"
    })
    .meta({
      required: {
        session: ["workspace"],
        key: ["memberships"]
      }
    })
    .use(authorized)
    .input(
      z.object({
        email: z.email().describe("Email address of the user to invite"),
        roleID: id().describe("ID of the role to assign")
      })
    )
    .output(membershipInviteResultType)
    .handler(async ({ context, input }) => {
      const newInviteDetails = await Memberships.invite({
        workspaceID: context.auth.workspaceID,
        email: input.email,
        roleID: input.roleID,
        inviterID: context.auth.session?.memberID
      });

      emitMembershipEvent(context.auth.workspaceID, {
        action: "invite:create",
        memberID: context.auth.session?.memberID,
        data: newInviteDetails.invite
      });

      return newInviteDetails;
    }),
  listInvites: base
    .route({
      method: "GET",
      path: "/invites"
    })
    .meta({
      required: {
        session: ["workspace"],
        key: ["memberships"]
      }
    })
    .use(authorized)
    .output(z.array(inviteDetailsType))
    .handler(({ context }) => {
      return Memberships.listInvites({
        workspaceID: context.auth.workspaceID
      });
    }),
  resendInvite: base
    .route({
      method: "POST",
      path: "/invites/:id/resend"
    })
    .meta({
      required: {
        session: ["workspace"],
        key: ["memberships"]
      }
    })
    .use(authorized)
    .input(
      z.object({
        id: id().describe("ID of the pending invitation")
      })
    )
    .output(inviteDeliveryResultType)
    .handler(async ({ context, input }) => {
      const emailDelivery = await Memberships.resendInvite({
        id: input.id,
        workspaceID: context.auth.workspaceID
      });

      return { emailDelivery };
    }),
  revokeInvite: base
    .route({
      method: "DELETE",
      path: "/invites/:id"
    })
    .meta({
      required: {
        session: ["workspace"],
        key: ["memberships"]
      }
    })
    .input(
      z.object({
        id: id().describe("ID of the invite to revoke")
      })
    )
    .use(authorized)
    .output(z.void())
    .handler(async ({ context, input }) => {
      await Memberships.revokeInvite({
        id: input.id,
        workspaceID: context.auth.workspaceID
      });

      emitMembershipEvent(context.auth.workspaceID, {
        action: "invite:revoke",
        memberID: context.auth.session?.memberID,
        data: {
          id: input.id
        }
      });
    }),
  acceptInvite: base
    .route({
      method: "POST",
      path: "/accept"
    })
    .meta({
      requireWorkspace: false,
      required: {
        session: true
      }
    })
    .use(authorized)
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

      emitMembershipEvent(result.workspaceID, {
        action: "membership:add",
        data: result.membership
      });

      return {
        workspaceID: result.workspaceID,
        workspaceName: result.workspaceName
      };
    })
});

export { membershipsRouter };
