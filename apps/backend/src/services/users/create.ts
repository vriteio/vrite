import { FullUser, userID, usersDB } from "#backend/db";
import { generateHOTP } from "@oslojs/otp";
import { status } from "elysia";
import { ObjectId } from "mongodb";
import { UnderscoreID } from "#backend/lib/mongo";
import { bytesToHex, validateEmail } from "#backend/lib/utils";

const createUser = async (input: {
  email: string;
  username: string;
  password?: string;
  emailVerification?: boolean;
  existingUser?: "error" | "return";
}): Promise<{ userID: string; emailVerificationCode?: string; existingUser?: boolean }> => {
  const hash = input.password ? await Bun.password.hash(input.password) : "";
  const existingUser = await usersDB.findOne({ email: input.email });

  if (existingUser) {
    if (input.existingUser !== "return") throw status("Bad Request");

    return { userID: userID(existingUser._id), existingUser: true };
  }

  const emailValid = await validateEmail(input.email);

  if (!emailValid) throw status("Bad Request");

  let user: UnderscoreID<FullUser<ObjectId>> = {
    _id: new ObjectId(),
    username: input.username,
    email: input.email,
    settings: { uiTheme: "system", accentColor: "andesine" },
    ...(input.password ? { hash } : {})
  };

  if (input.emailVerification !== false) {
    const emailVerificationToken = crypto.getRandomValues(new Uint8Array(20));
    const emailVerificationCode = generateHOTP(emailVerificationToken, 10n, 6);

    user = {
      ...user,
      emailVerificationToken: bytesToHex(emailVerificationToken),
      emailVerificationTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
    };

    await usersDB.insertOne(user);

    return {
      emailVerificationCode,
      userID: userID(user._id)
    };
  }

  await usersDB.insertOne(user);

  return { userID: userID(user._id) };
};

export { createUser };
