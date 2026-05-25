import { userID, usersDB } from "#backend/db";
import { verifyHOTP } from "@oslojs/otp";
import { status } from "elysia";
import { hexToBytes } from "#backend/lib/utils";

const verifyEmail = async (input: { email: string; otp: string }): Promise<{ userID: string }> => {
  const user = await usersDB.findOne({
    email: input.email
  });

  if (!user || !user.emailVerificationToken) throw status("Bad Request");

  const emailVerificationToken = hexToBytes(user.emailVerificationToken);
  const verified = verifyHOTP(emailVerificationToken, 10n, 6, input.otp);

  if (!verified) throw status("Bad Request");

  await usersDB.updateOne(
    {
      _id: user._id
    },
    {
      $unset: { emailVerificationToken: "", emailVerificationTokenExpiresAt: "" }
    }
  );

  return { userID: userID(user._id) };
};

export { verifyEmail };
