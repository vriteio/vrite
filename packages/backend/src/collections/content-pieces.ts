import { Tag } from "./tags";
import { Profile, profile } from "./users";
import { Collection, Db, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";

const contentPiece = z.object({
  id: zodId(),
  date: z.string().optional().nullable(),
  title: z.string(),
  description: z.string().optional().nullable(),
  tags: z.array(zodId()),
  coverUrl: z.string().optional().nullable(),
  coverAlt: z.string().optional().nullable(),
  contentGroupId: zodId(),
  customData: z.any().optional().nullable(),
  canonicalLink: z.string().optional().nullable(),
  slug: z.string(),
  filename: z.string().optional().nullable(),
  members: z.array(zodId())
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
