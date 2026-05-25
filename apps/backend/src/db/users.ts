import { db, fromObjectID, objectID, UnderscoreID } from "#backend/lib/mongo";
import { ObjectId } from "mongodb";
import * as z from "zod";

const userType = z.object({
  id: objectID().describe("ID of the user"),
  name: z.string().max(320).optional().describe("User's full name"),
  email: z.email().max(320).describe("Email address"),
  emailVerified: z.boolean().describe("Whether the user's email is verified"),
  image: z.string().optional().describe("URL of the user's avatar image"),
  createdAt: z.iso.datetime().describe("The creation date of the user record"),
  updatedAt: z.iso.datetime().describe("The date of the last update of the user record"),
  currentWorkspaceID: objectID().optional().describe("ID of the user's latest active workspace")
});
const userProfileType = userType.pick({
  id: true,
  name: true,
  email: true,
  image: true
});

interface User<ID extends string | ObjectId = string> extends Omit<
  z.infer<typeof userType>,
  "id" | "currentWorkspaceID" | "createdAt" | "updatedAt"
> {
  id: ID;
  currentWorkspaceID?: ID;
  createdAt: ID extends string ? string : Date;
  updatedAt: ID extends string ? string : Date;
}
interface UserProfile<ID extends string | ObjectId = string> extends Omit<
  z.infer<typeof userProfileType>,
  "id"
> {
  id: ID;
}
interface FullUser<ID extends string | ObjectId = string> extends User<ID> {}

const toUserID = (id: ObjectId) => fromObjectID(id, "usr");
const usersDB = db.collection<UnderscoreID<FullUser<ObjectId>>>("users");

await usersDB.createIndex(
  { emailVerificationCodeExpiresAt: 1 },
  { expireAfterSeconds: 0, sparse: true, name: "emailVerificationCodeExpiresAt_1" }
);
await usersDB.createIndex({ email: 1 }, { unique: true, name: "email_1" });

export { userType, userProfileType, usersDB, toUserID };
export type { User, UserProfile, FullUser };
