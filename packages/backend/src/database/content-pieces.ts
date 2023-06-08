import { Tag } from "./tags";
import { Collection, Db, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";
import { Profile, profile } from "./users";

const contentPiece = z.object({
  id: zodId(),
  date: z.string().optional().nullable().describe("ISO date"),
  title: z.string().describe("Title"),
  description: z.string().optional().nullable().describe("HTML-formatted description"),
  tags: z.array(zodId()).describe("Array of tag IDs"),
  coverUrl: z.string().optional().nullable().describe("URL of the cover image"),
  coverAlt: z.string().optional().nullable().describe("Alt description of the cover image"),
  contentGroupId: zodId().describe("ID of the content group the piece is assigned to"),
  customData: z.any().optional().nullable().describe("JSON object containing custom metadata"),
  canonicalLink: z
    .string()
    .optional()
    .nullable()
    .describe("Canonical link for cross-posting to different platforms"),
  slug: z.string().describe("Content piece slug"),
  members: z.array(zodId()).describe("Array of member IDs")
});
const contentPieceMember = z.object({
  id: zodId(),
  profile: profile.omit({ bio: true })
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
interface ContentPieceWithTags<ID extends string | ObjectId = string>
  extends Omit<ContentPiece<ID>, "tags" | "members"> {
  tags: Array<Tag<ID>>;
  members: Array<ContentPieceMember<ID>>;
}
interface FullContentPiece<ID extends string | ObjectId = string> extends ContentPiece<ID> {
  workspaceId: ID;
  order: string;
  locked?: boolean;
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
> = ContentPieceWithTags<ID> & Pick<FullContentPieceWithAdditionalData<ID>, Exclude<K, undefined>>;

const getContentPiecesCollection = (
  db: Db
): Collection<UnderscoreID<FullContentPiece<ObjectId>>> => {
  return db.collection("content-pieces");
};

export { contentPiece, contentPieceMember, getContentPiecesCollection };
export type {
  ContentPiece,
  ContentPieceMember,
  ContentPieceWithTags,
  FullContentPiece,
  FullContentPieceWithAdditionalData,
  ExtendedContentPiece,
  ExtendedContentPieceWithAdditionalData
};
