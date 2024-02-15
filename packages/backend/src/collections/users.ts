import { Collection, Db, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";

const user = z.object({
  id: zodId().describe("ID of the user"),
  username: z.string().describe("Short username").min(1).max(20),
  email: z.string().describe("Email address").email().max(320),
  external: z
    .object({
      github: z
        .object({
          id: z.string().describe("GitHub user ID")
        })
        .describe("Data associated with GitHub OAuth authentication")
        .optional()
    })
    .describe("Data associated with external authentication providers")
    .optional(),
  avatar: z.string().describe("URL of the user's profile image").optional(),
  bio: z.string().describe("User's bio").optional(),
  fullName: z.string().describe("User's full name").max(50).optional(),
  emailVerificationCode: z.string().describe("Code used to verify the user's email").optional(),
  emailVerificationCodeExpiresAt: z
    .string()
    .describe("Date when the email verification code expires")
    .optional(),
  totpSecret: z.string().describe("Secret used for TOTP two-factor authentication").optional()
});
const verificationDetails = z.object({
  newEmailChangeInVerification: z
    .boolean()
    .describe("Whether a new email is in verification after a change"),
  oldEmailChangeInVerification: z
    .boolean()
    .describe("Whether an old email is in verification after a change"),
  passwordChangeInVerification: z
    .boolean()
    .describe("Whether a password change is in verification"),
  emailInVerification: z.boolean().describe("Whether the email is in verification after a sign up")
});
const profile = user.pick({
  id: true,
  avatar: true,
  username: true,
  bio: true,
  fullName: true,
  email: true
});

interface VerificationDetails extends z.infer<typeof verificationDetails> {}
interface User<ID extends string | ObjectId = string>
  extends Omit<z.infer<typeof user>, "emailVerificationCodeExpiresAt" | "id"> {
  id: ID;
  emailVerificationCodeExpiresAt?: ID extends ObjectId ? Date : string;
}
interface Profile<ID extends string | ObjectId = string>
  extends Omit<z.infer<typeof profile>, "id"> {
  id: ID;
}
interface FullUser<ID extends string | ObjectId = string> extends User<ID> {
  hash?: string;
  salt: string;
}

const getUsersCollection = (db: Db): Collection<UnderscoreID<FullUser<ObjectId>>> => {
  return db.collection("users");
};

export { user, profile, verificationDetails, getUsersCollection };
export type { User, Profile, FullUser, VerificationDetails };
