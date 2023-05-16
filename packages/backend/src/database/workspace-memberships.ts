import { z } from "zod";
import { Collection, Db, ObjectId } from "mongodb";
import { UnderscoreID, zodId } from "#lib/mongo";

const workspaceMembership = z.object({
  id: zodId(),
  userId: zodId().optional(),
  roleId: zodId(),
  email: z.string().email().optional(),
  name: z.string().max(50).optional()
});
const workspaceInviteCodeDetails = z.object({
  inviteVerificationCode: z.string().optional(),
  inviteVerificationCodeSalt: z.string().optional(),
  inviteVerificationCodeExpireAt: z.string().optional()
});

interface WorkspaceMembership<ID extends string | ObjectId = string>
  extends Omit<z.infer<typeof workspaceMembership>, "userId" | "roleId" | "id"> {
  id: ID;
  userId?: ID;
  roleId: ID;
}
interface WorkspaceInviteCodeDetails<ID extends string | ObjectId = string>
  extends Omit<z.infer<typeof workspaceInviteCodeDetails>, "inviteVerificationCodeExpireAt"> {
  inviteVerificationCodeExpireAt?: ID extends string ? string : Date;
}
interface FullWorkspaceMembership<ID extends string | ObjectId = string>
  extends WorkspaceMembership<ID>,
    WorkspaceInviteCodeDetails<ID> {
  workspaceId: ID;
}

const getWorkspaceMembershipsCollection = (
  db: Db
): Collection<UnderscoreID<FullWorkspaceMembership<ObjectId>>> => {
  return db.collection("workspace-memberships");
};

export { workspaceMembership, getWorkspaceMembershipsCollection };
export type { WorkspaceMembership, FullWorkspaceMembership };
