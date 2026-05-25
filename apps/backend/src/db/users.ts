import { db, fromObjectID, objectID, UnderscoreID } from "#backend/lib/mongo";
import { ObjectId } from "mongodb";
import { Static, t } from "elysia";

const uiThemeType = t.UnionEnum(["light", "dark", "system"]);
const accentColorType = t.UnionEnum(["andesine", "aquamarine", "amethyst", "amber", "emerald"]);
const userSettingsType = t.Object({
  uiTheme: uiThemeType,
  accentColor: accentColorType
});
const userType = t.Object({
  id: objectID({ description: "ID of the user" }),
  username: t.String({
    description: "Short username",
    minLength: 1,
    maxLength: 50
  }),
  email: t.String({
    description: "Email address",
    format: "email",
    maxLength: 320
  }),
  avatar: t.Optional(
    t.String({
      description: "URL of the user's profile image"
    })
  ),
  fullName: t.Optional(
    t.String({
      description: "User's full name",
      maxLength: 320
    })
  ),
  emailVerificationToken: t.Optional(
    t.String({
      description: "Token used to generate email verification OTP"
    })
  ),
  emailVerificationTokenExpiresAt: t.Optional(
    t.String({
      description: "Date when the email verification token expires",
      format: "date-time"
    })
  ),
  totpSecret: t.Optional(
    t.String({
      description: "Secret used for TOTP two-factor authentication"
    })
  ),
  currentWorkspaceID: t.Optional(
    objectID({ description: "ID of the user's latest active workspace" })
  ),
  settings: userSettingsType
});
const verificationDetailsType = t.Object({
  newEmailChangeInVerification: t.Boolean({
    description: "Whether a new email is in verification after a change"
  }),
  oldEmailChangeInVerification: t.Boolean({
    description: "Whether an old email is in verification after a change"
  }),
  passwordChangeInVerification: t.Boolean({
    description: "Whether a password change is in verification"
  }),
  emailInVerification: t.Boolean({
    description: "Whether the email is in verification after a sign up"
  })
});
const profileType = t.Pick(userType, ["id", "avatar", "username", "bio", "fullName", "email"]);

interface UserSettings extends Static<typeof userSettingsType> {}
interface VerificationDetails extends Static<typeof verificationDetailsType> {}
interface User<ID extends string | ObjectId = string>
  extends Omit<
    Static<typeof userType>,
    "emailVerificationTokenExpiresAt" | "id" | "currentWorkspaceID"
  > {
  id: ID;
  emailVerificationTokenExpiresAt?: ID extends ObjectId ? Date : string;
  currentWorkspaceID?: ID;
}
interface Profile<ID extends string | ObjectId = string>
  extends Omit<Static<typeof profileType>, "id"> {
  id: ID;
}
interface FullUser<ID extends string | ObjectId = string> extends User<ID> {
  hash?: string;
}

const userID = (id: ObjectId) => fromObjectID(id, "usr");
const usersDB = db.collection<UnderscoreID<FullUser<ObjectId>>>("users");

await usersDB.createIndex(
  { emailVerificationCodeExpiresAt: 1 },
  { expireAfterSeconds: 0, sparse: true }
);
await usersDB.createIndex({ email: 1 }, { unique: true });

export { userType, profileType, verificationDetailsType, usersDB, userID };
export type { User, Profile, FullUser, VerificationDetails, UserSettings };
