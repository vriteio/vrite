import { MemberDetails, listMembers } from "./list";
import { updateMember } from "./update";
import { removeMember } from "./remove";
import { inviteMember } from "./invite";
import { acceptInvite } from "./accept-invite";
import { InviteDetails, listInvites } from "./list-invites";
import { revokeInvite } from "./revoke-invite";
import { resendInvite } from "./resend-invite";

const Memberships = {
  list: listMembers,
  update: updateMember,
  remove: removeMember,
  invite: inviteMember,
  acceptInvite,
  listInvites,
  revokeInvite,
  resendInvite
};

export { Memberships };
export type { MemberDetails, InviteDetails };
