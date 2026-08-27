import { base62ToBytes, bytesToBase62, bytesToHex, hexToBytes } from "./encoding";
import * as z from "zod";

const UUID_REGEX = /^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const ID_REGEX = /^(?:\w+?_[A-Za-z\d]{1,22})$/;

type PublicIDPrefix = "usr" | "ws" | "rl" | "ms" | "inv" | "grp" | "coll" | "ent" | "adn" | "ver";

const id = (options?: Exclude<Parameters<typeof z.regex>[1], string>) => {
  return z.string().regex(ID_REGEX, { error: "invalid id", ...options });
};
const publicID = (
  prefix: PublicIDPrefix,
  options?: Exclude<Parameters<typeof z.regex>[1], string>
) => {
  return z.string().regex(new RegExp(`^${prefix}_[A-Za-z\\d]{1,22}$`), {
    error: `invalid ${prefix} id`,
    ...options
  });
};
const generateUUID = () => crypto.randomUUID();
const toUUID = (value: string): string => {
  if (UUID_REGEX.test(value)) return value.toLowerCase();

  const encoded = value.split("_").pop() || "";
  let bytes = base62ToBytes(encoded);

  while (bytes.length > 16 && bytes[0] === 0) {
    bytes = bytes.slice(1);
  }

  if (bytes.length > 16) throw new Error("Invalid ID");

  const hex = bytesToHex(bytes).padStart(32, "0");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
const fromUUID = (value: string, prefix?: PublicIDPrefix): string => {
  if (!UUID_REGEX.test(value)) throw new Error("Invalid UUID");

  const bytes = hexToBytes(value.replaceAll("-", ""));
  const encoded = bytesToBase62(bytes);

  return prefix ? `${prefix}_${encoded}` : encoded;
};

const toUserID = (value: string) => fromUUID(value, "usr");
const toWorkspaceID = (value: string) => fromUUID(value, "ws");
const toRoleID = (value: string) => fromUUID(value, "rl");
const toMembershipID = (value: string) => fromUUID(value, "ms");
const toInviteID = (value: string) => fromUUID(value, "inv");
const toGroupID = (value: string) => fromUUID(value, "grp");
const toCollectionID = (value: string) => fromUUID(value, "coll");
const toEntryID = (value: string) => fromUUID(value, "ent");
const toKeyID = (value: string) => fromUUID(value, "adn");
const toVersionID = (value: string) => fromUUID(value, "ver");

export {
  fromUUID,
  generateUUID,
  id,
  publicID,
  toCollectionID,
  toEntryID,
  toGroupID,
  toInviteID,
  toKeyID,
  toMembershipID,
  toRoleID,
  toUserID,
  toVersionID,
  toUUID,
  toWorkspaceID
};
export type { PublicIDPrefix };
