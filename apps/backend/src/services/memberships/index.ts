import { listMembers } from "./list";
import { updateMember } from "./update";
import { removeMember } from "./remove";
import { inviteMember } from "./invite";
import { acceptInvite } from "./accept-invite";
import { listInvites } from "./list-invites";
import { revokeInvite } from "./revoke-invite";

const Memberships = {
  list: listMembers,
  update: updateMember,
  remove: removeMember,
  invite: inviteMember,
  acceptInvite,
  listInvites,
  revokeInvite
};

export { Memberships };
