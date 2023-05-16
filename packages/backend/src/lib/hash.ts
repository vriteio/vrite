import { promisify } from "node:util";
import crypto from "node:crypto";

const pbkdf2 = promisify(crypto.pbkdf2);
const generateSalt = async (): Promise<string> => {
  return crypto.randomBytes(16).toString("hex");
};
const hashValue = async (value: string, salt: string): Promise<string> => {
  const hashBuffer = await pbkdf2(value, salt, 100, 64, "sha512");

  return hashBuffer.toString("hex");
};
const verifyValue = async (value: string, salt: string, hash: string): Promise<boolean> => {
  const hashBuffer = await pbkdf2(value, salt, 100, 64, "sha512");

  return hashBuffer.toString("hex") === hash;
};

export { generateSalt, hashValue, verifyValue };
