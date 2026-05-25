import { status } from "elysia";
import { userID, usersDB } from "#backend/db";

const login = async (input: {
  email: string;
  password: string;
}): Promise<{
  userID: string;
}> => {
  const user = await usersDB.findOne({ email: input.email });

  if (!user) throw status("Bad Request");

  const verified = await Bun.password.verify(input.password, user?.hash || "");

  if (!verified) throw status("Bad Request");

  return {
    userID: userID(user._id)
  };
};

export { login };
