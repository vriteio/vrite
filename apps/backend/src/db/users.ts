import { db, fromUUID, id, UnderscoreID } from "#backend/lib/mongo";
import type { UUID } from "#backend/lib/mongo";
import * as z from "zod";

const userType = z.object({
  id: id().describe("ID of the user"),
  name: z.string().max(320).optional().describe("User's full name"),
  email: z.email().max(320).describe("Email address"),
  emailVerified: z.boolean().describe("Whether the user's email is verified"),
  image: z.string().optional().describe("URL of the user's avatar image"),
  createdAt: z.iso.datetime().describe("The creation date of the user record"),
  updatedAt: z.iso.datetime().describe("The date of the last update of the user record"),
  currentWorkspaceID: id().optional().describe("ID of the user's latest active workspace")
});
const userProfileType = userType.pick({
  id: true,
  name: true,
  email: true,
  image: true
});

interface User<ID extends string | UUID = string> extends Omit<
  z.infer<typeof userType>,
  "id" | "currentWorkspaceID" | "createdAt" | "updatedAt"
> {
  id: ID;
  currentWorkspaceID?: ID;
  createdAt: ID extends UUID ? Date : string;
  updatedAt: ID extends UUID ? Date : string;
}
interface UserProfile<ID extends string | UUID = string> extends Omit<
  z.infer<typeof userProfileType>,
  "id"
> {
  id: ID;
}
interface FullUser<ID extends string | UUID = string> extends User<ID> {}

const toUserID = (id: UUID) => fromUUID(id, "usr");
const usersDB = db.collection<UnderscoreID<FullUser<UUID>>>("users");

await usersDB.createIndex(
  { emailVerificationCodeExpiresAt: 1 },
  { expireAfterSeconds: 0, sparse: true, name: "emailVerificationCodeExpiresAt_1" }
);
await usersDB.createIndex({ email: 1 }, { unique: true, name: "email_1" });

export { userType, userProfileType, usersDB, toUserID };
export type { User, UserProfile, FullUser };
