import { base62ToBytes, bytesToBase62, bytesToHex, hexToBytes } from "./base-conversion";

const UUID_REGEX = /^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;

const generateUUID = () => crypto.randomUUID();
const toUUID = (id: string): string => {
  if (UUID_REGEX.test(id)) return id;

  const bytes = base62ToBytes(id.split("_").pop() || "");
  if (bytes.length > 16) throw new Error("Invalid ID");

  const hex = bytesToHex(bytes).padStart(32, "0");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
const fromUUID = (uuid: string, prefix?: string): string => {
  const bytes = hexToBytes(uuid.replaceAll("-", ""));

  return `${prefix || ""}${prefix ? "_" : ""}${bytesToBase62(bytes)}`;
};
const toEntryID = (uuid: string) => fromUUID(uuid, "ent");

export { generateUUID, toUUID, fromUUID, toEntryID };
