import { Collection, Db, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";

const tokenPermission = z.enum([
  "contentPieces:read",
  "contentGroups:read",
  "roles:read",
  "tags:read",
  "userSettings:read",
  "webhooks:read",
  "profile:read",
  "workspaceMemberships:read",
  "workspace:read",
  "contentPieces:write",
  "contentGroups:write",
  "roles:write",
  "tags:write",
  "userSettings:write",
  "webhooks:write",
  "workspaceMemberships:write",
  "workspace:write"
]);
const token = z.object({
  id: zodId(),
  name: z.string().min(1).max(50),
  description: z.string(),
  permissions: z.array(tokenPermission)
});

type TokenPermission = z.infer<typeof tokenPermission>;

interface Token<ID extends string | ObjectId = string>
  extends Omit<z.infer<typeof token>, "id" | "extensionId"> {
  id: ID;
}
interface FullToken<ID extends string | ObjectId = string> extends Token<ID> {
  workspaceId: ID;
  userId: ID;
  salt: string;
  username: string;
  password: string;
  extensionId?: ID;
}

const getTokensCollection = (db: Db): Collection<UnderscoreID<FullToken<ObjectId>>> => {
  return db.collection("tokens");
};

export { token, tokenPermission, getTokensCollection };
export type { TokenPermission, Token, FullToken };
