import { Collection, Db, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";

const user = z.object({
  id: zodId(),
  username: z.string().min(1).max(20),
  email: z.string().email(),
  external: z
    .object({
      github: z
        .object({
          id: z.string()
        })
        .optional()
    })
    .optional(),
  avatar: z.string().optional(),
  bio: z.string().optional(),
  fullName: z.string().max(50).optional(),
  emailVerificationCode: z.string().optional(),
  emailVerificationCodeExpiresAt: z.string().optional(),
  totpSecret: z.string().optional()
});
const verificationDetails = z.object({
  newEmailChangeInVerification: z.boolean(),
  oldEmailChangeInVerification: z.boolean(),
  passwordChangeInVerification: z.boolean(),
  emailInVerification: z.boolean()
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
