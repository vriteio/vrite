import { createHash, randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { bytesToBase62 } from "./base-conversion";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";

const deriveKey = (secret: string): Buffer => {
  return createHash("sha256").update(secret).digest();
};

const encrypt = (plaintext: string, secret: string): string => {
  const key = deriveKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
};

const decrypt = (encryptedData: string, secret: string): string => {
  const [ivHex, authTagHex, ciphertextHex] = encryptedData.split(":");
  const key = deriveKey(secret);
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);

  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
};

const generateSalt = (): string => {
  return randomBytes(16).toString("hex");
};
const hashKey = (raw: string, salt?: string): string => {
  return createHash("sha256")
    .update(`${salt || ""}${raw}`)
    .digest("hex");
};
const generateKeyValue = (): { raw: string; prefix: string } => {
  const raw = `adn_${bytesToBase62(randomBytes(32))}`;
  const prefix = raw.slice(0, 12);

  return { raw, prefix };
};
const generateInviteToken = (): { raw: string; hash: string } => {
  const raw = bytesToBase62(randomBytes(32));
  const hash = createHash("sha256").update(raw).digest("hex");

  return { raw, hash };
};

export { generateSalt, hashKey, generateKeyValue, generateInviteToken, encrypt, decrypt };
