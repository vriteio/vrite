import { membershipDB, toInviteID, usersDB, type FullInvite } from "#backend/db";
import { sendEmail } from "#backend/lib/email";
import type { UnderscoreID, UUID } from "#backend/lib/mongo";

type InviteDelivery = "sent" | "manual" | "failed";
import { config } from "#backend/lib/config";
import { createHmac, timingSafeEqual } from "node:crypto";

const inviteSignature = (id: string, expires: number): string => {
  return createHmac("sha256", config.SECRET).update(`${id}.${expires}`).digest("hex");
};

const createInviteLink = (input: { id: string; expiresAt: Date | string }): string => {
  const expires = Math.floor(new Date(input.expiresAt).getTime() / 1000);
  const url = new URL("/invite", config.PUBLIC_APP_URL);

  url.searchParams.set("id", input.id);
  url.searchParams.set("expires", `${expires}`);
  url.searchParams.set("signature", inviteSignature(input.id, expires));

  return url.toString();
};

const verifyInviteLink = (input: { id: string; expires: number; signature: string }): boolean => {
  if (!Number.isSafeInteger(input.expires) || input.expires * 1000 <= Date.now()) return false;
  if (!/^[a-f\d]{64}$/i.test(input.signature)) return false;

  const expected = Buffer.from(inviteSignature(input.id, input.expires), "hex");
  const received = Buffer.from(input.signature, "hex");

  return expected.length === received.length && timingSafeEqual(expected, received);
};
const deliverInvite = async (input: {
  invite: UnderscoreID<FullInvite<UUID>>;
  workspaceName: string;
}): Promise<{ emailDelivery: InviteDelivery; inviteLink: string }> => {
  const { invite, workspaceName } = input;
  const inviteLink = createInviteLink({
    id: toInviteID(invite._id),
    expiresAt: invite.expiresAt
  });

  let inviterName = "Someone";

  if (invite.invitedBy) {
    const inviterMembership = await membershipDB.findOne({ _id: invite.invitedBy });

    if (inviterMembership) {
      const inviter = await usersDB.findOne({ _id: inviterMembership.userID });

      inviterName = inviter?.name || inviter?.email || inviterName;
    }
  }

  try {
    const delivery = await sendEmail(invite.email, "workspace-invite", {
      workspaceName,
      inviterName,
      inviteLink
    });

    return { emailDelivery: delivery.status, inviteLink };
  } catch (error) {
    console.error("Failed to deliver workspace invite email", {
      inviteID: toInviteID(invite._id),
      email: invite.email,
      error
    });

    return { emailDelivery: "failed", inviteLink };
  }
};

export { createInviteLink, verifyInviteLink, deliverInvite };
export type { InviteDelivery };
