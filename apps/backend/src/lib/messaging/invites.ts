import { memberships, users } from "#backend/db";
import { sendEmail } from "#backend/lib/adapters";
import { config } from "#backend/lib/config";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "#backend/lib/adapters";
import { toInviteID } from "#backend/lib/primitives";

type InviteDelivery = "sent" | "manual" | "failed";
interface DeliverableInvite {
  id: string;
  email: string;
  invitedBy: string | null;
  expiresAt: Date;
}

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
  invite: DeliverableInvite;
  workspaceName: string;
}): Promise<{ emailDelivery: InviteDelivery; inviteLink: string }> => {
  const { invite, workspaceName } = input;
  const publicInviteID = toInviteID(invite.id);
  const inviteLink = createInviteLink({ id: publicInviteID, expiresAt: invite.expiresAt });
  let inviterName = "Someone";

  if (invite.invitedBy) {
    const [inviter] = await db
      .select({ name: users.name, email: users.email })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userID))
      .where(eq(memberships.id, invite.invitedBy))
      .limit(1);

    inviterName = inviter?.name || inviter?.email || inviterName;
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
      inviteID: publicInviteID,
      email: invite.email,
      error
    });

    return { emailDelivery: "failed", inviteLink };
  }
};

export { createInviteLink, verifyInviteLink, deliverInvite };
export type { DeliverableInvite, InviteDelivery };
