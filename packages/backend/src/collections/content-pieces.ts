import { Tag } from "./tags";
import { Profile, profile } from "./users";
import { Collection, Db, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";

const contentPiece = z.object({
  id: zodId().describe("ID of the content piece"),
  date: z
    .string()
    .describe("ISO-formatted date metadata of the content piece")
    .optional()
    .nullable(),
  title: z.string().describe("Title of the content piece"),
  description: z.string().describe("Description of the content piece").optional().nullable(),
  tags: z.array(zodId()).describe("IDs of the tags assigned to the content piece"),
  coverUrl: z.string().describe("URL of the cover image").optional().nullable(),
  coverAlt: z.string().describe("Alt text of the cover image").optional().nullable(),
  contentGroupId: zodId().describe("ID of the content group the piece is directly assigned to"),
  customData: z.any().describe("Custom JSON data of the content piece").optional().nullable(),
  canonicalLink: z.string().describe("Canonical link of the content piece").optional().nullable(),
  slug: z.string().describe("Slug of the content piece"),
  filename: z.string().describe("Filename of the content piece").optional().nullable(),
  members: z.array(zodId()).describe("IDs of the workspace members assigned to the content piece")
});
const contentPieceMember = z.object({
  id: zodId().describe("ID of the workspace member"),
  profile: profile.omit({ bio: true }).describe("Profile data of the user")
});

interface ContentPieceMember<ID extends string | ObjectId = string> {
  id: ID;
  profile: Omit<Profile<ID>, "bio">;
}
interface ContentPiece<ID extends string | ObjectId = string>
  extends Omit<
    z.infer<typeof contentPiece>,
    "id" | "contentGroupId" | "date" | "tags" | "members"
  > {
  id: ID;
  contentGroupId: ID;
  date?: (ID extends string ? string : Date) | null;
  tags: ID[];
  members: ID[];
}
interface ContentPieceWithAdditionalData<ID extends string | ObjectId = string>
  extends Omit<ContentPiece<ID>, "tags" | "members"> {
  tags: Array<Tag<ID>>;
  members: Array<ContentPieceMember<ID>>;
}
interface FullContentPiece<ID extends string | ObjectId = string> extends ContentPiece<ID> {
  workspaceId: ID;
  order: string;
  coverWidth?: string;
}
interface FullContentPieceWithAdditionalData<ID extends string | ObjectId = string>
  extends Omit<FullContentPiece<ID>, "tags" | "members"> {
  tags: Array<Tag<ID>>;
  members: Array<ContentPieceMember<ID>>;
}

type ExtendedContentPiece<
  K extends keyof Omit<FullContentPiece, keyof ContentPiece> | undefined = undefined,
  ID extends string | ObjectId = string
> = ContentPiece<ID> & Pick<FullContentPiece<ID>, Exclude<K, undefined>>;

type ExtendedContentPieceWithAdditionalData<
  K extends keyof Omit<FullContentPiece, keyof ContentPiece> | undefined = undefined,
  ID extends string | ObjectId = string
> = ContentPieceWithAdditionalData<ID> &
  Pick<FullContentPieceWithAdditionalData<ID>, Exclude<K, undefined>>;

const getContentPiecesCollection = (
  db: Db
): Collection<UnderscoreID<FullContentPiece<ObjectId>>> => {
  return db.collection("content-pieces");
};

export { contentPiece, contentPieceMember, getContentPiecesCollection };
export type {
  ContentPiece,
  ContentPieceMember,
  ContentPieceWithAdditionalData,
  FullContentPiece,
  FullContentPieceWithAdditionalData,
  ExtendedContentPiece,
  ExtendedContentPieceWithAdditionalData
};
