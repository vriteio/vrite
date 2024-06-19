import { Profile, profile } from "./users";
import { Collection, Db, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";

const version = z.object({
  id: zodId().describe("ID of the version"),
  label: z.string().optional().describe("Custom label assigned to the version"),
  date: z.string().describe("ISO-formatted date of the version"),
  contentPieceId: zodId().describe("ID of the content piece"),
  variantId: zodId().optional().describe("ID of the variant"),
  members: z.array(zodId()).describe("IDs of the workspace members associated with the version")
});
const versionMember = z.object({
  id: zodId().describe("ID of the workspace member"),
  profile: profile.omit({ bio: true }).describe("Profile data of the user")
});

interface VersionMember<ID extends string | ObjectId = string> {
  id: ID;
  profile: Omit<Profile<ID>, "bio">;
}
interface Version<ID extends string | ObjectId = string>
  extends Omit<
    z.infer<typeof version>,
    "id" | "contentPieceId" | "variantId" | "date" | "members"
  > {
  id: ID;
  date: ID extends string ? string : Date;
  contentPieceId: ID;
  variantId?: ID;
  members: ID[];
}
interface VersionWithAdditionalData<ID extends string | ObjectId = string>
  extends Omit<Version<ID>, "members"> {
  members: Array<VersionMember<ID>>;
}

interface FullVersion<ID extends string | ObjectId = string> extends Version<ID> {
  workspaceId: ID;
}
interface FullVersionWithAdditionalData<ID extends string | ObjectId = string>
  extends Omit<FullVersion<ID>, "members"> {
  members: Array<VersionMember<ID>>;
}

const getVersionsCollection = (db: Db): Collection<UnderscoreID<FullVersion<ObjectId>>> => {
  return db.collection("versions");
};

export { version, versionMember, getVersionsCollection };
export type {
  Version,
  VersionWithAdditionalData,
  FullVersion,
  FullVersionWithAdditionalData,
  VersionMember
};
