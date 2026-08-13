import type { Invite, Membership, Role, UserProfile } from "#web/lib/api";

interface WorkspaceMember extends Membership {
  profile: UserProfile;
  admin?: boolean;
}
interface InviteDetails extends Invite {
  inviteLink: string;
  workspaceID: string;
}
interface WorkspaceMemberListProps {
  canManage: boolean;
  canManageRoles: boolean;
  disabledNonAdmins: boolean;
  currentUserID?: string;
  members: WorkspaceMember[];
  membersRefreshing?: boolean;
  refreshMembers(onRevalidated?: () => void): void;
  roles: Role[];
}
interface InviteListProps {
  invites: InviteDetails[];
  invitesRefreshing?: boolean;
  refreshInvites(onRevalidated?: () => void): void;
  roles: Role[];
}
interface InvitationSubsectionProps {
  invites: InviteDetails[];
  roles: Role[];
}

export type {
  InvitationSubsectionProps,
  InviteDetails,
  InviteListProps,
  WorkspaceMember,
  WorkspaceMemberListProps
};
