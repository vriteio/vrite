import { z } from "zod";
import { Collection, Db, ObjectId } from "mongodb";
import { UnderscoreID, zodId } from "#lib/mongo";

const workspaceMembership = z.object({
  id: zodId().describe("ID of the workspace member"),
  userId: zodId().describe("ID of the associated user").optional(),
  roleId: zodId().describe("ID of the member's role in the workspace"),
  email: z.string().describe("Email of the invited member").email().max(320).optional(),
  name: z.string().describe("Temporary name of the invited member").max(50).optional()
});
const workspaceInviteCodeDetails = z.object({
  inviteVerificationCode: z
    .string()
    .describe("Verification code for the workspace invite")
    .optional(),
  inviteVerificationCodeSalt: z.string().describe("Salt for the verification code").optional(),
  inviteVerificationCodeExpireAt: z
    .string()
    .describe("Expiration date for the verification code")
    .optional()
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
