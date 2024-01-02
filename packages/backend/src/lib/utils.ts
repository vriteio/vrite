import { AuthenticatedContext } from "./middleware";
import { generateSalt, hashValue } from "./hash";
import { OgObject } from "open-graph-scraper/dist/lib/types";
import { Db, ObjectId } from "mongodb";
import { nanoid } from "nanoid";
import {
  getTagsCollection,
  ContentPieceMember,
  getWorkspaceMembershipsCollection,
  getUsersCollection,
  ContentPiece,
  Tag,
  getWorkspaceSettingsCollection,
  FullToken,
  Token,
  getTokensCollection
} from "#collections";
import { UnderscoreID } from "#lib/mongo";

const stringToRegex = (str: string): RegExp => {
  return new RegExp(`^${str.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&")}`, "i");
};
const extractPreviewDataFromOpenGraph = (input: OgObject): string => {
  if (input.ogImage) {
    if (typeof input.ogImage === "string") {
      return input.ogImage;
    }

    if (Array.isArray(input.ogImage)) {
      return input.ogImage[0].url;
    }

    return (input.ogImage as any).url;
  }

  if (input.twitterImage && typeof input.twitterImage === "string") {
    return input.twitterImage;
  }

  return "";
};
const fetchContentPieceTags = async (
  db: Db,
  contentPiece: UnderscoreID<ContentPiece<ObjectId>>
): Promise<Tag[]> => {
  const tagsCollection = getTagsCollection(db);
  const tags = await tagsCollection.find({ _id: { $in: contentPiece.tags } }).toArray();

  return contentPiece.tags
    .map((tagId) => {
      const { _id, workspaceId, ...tag } = tags.find((tag) => `${tag._id}` === `${tagId}`) || {};

      if (!_id) return null;

      return { ...tag, id: `${_id}` };
    })
    .filter((value) => value) as Tag[];
};
const fetchContentPieceMembers = async (
  db: Db,
  contentPiece: UnderscoreID<ContentPiece<ObjectId>>
): Promise<Array<ContentPieceMember>> => {
  const memberIds = contentPiece.members || [];
  const workspaceMembershipsCollection = getWorkspaceMembershipsCollection(db);
  const usersCollection = getUsersCollection(db);
  const memberships = await workspaceMembershipsCollection
    .find({ _id: { $in: memberIds } })
    .toArray();
  const users = await usersCollection
    .find({
      _id: {
        $in: memberships
          .map((membership) => membership.userId)
          .filter((value) => value) as ObjectId[]
      }
    })
    .toArray();

  return memberIds
    .map((membershipId) => {
      const membership = memberships.find(
        (membership) => `${membership._id}` === `${membershipId}`
      );
      const user = users.find((user) => {
        if (!membership?.userId) return false;

        return user._id.equals(membership?.userId);
      });

      if (!membership || !user) return null;

      return {
        id: `${membership._id}`,
        profile: {
          id: `${user._id}`,
          email: user.email,
          avatar: user.avatar,
          username: user.username,
          fullName: user.fullName
        }
      };
    })
    .filter((value) => value) as Array<ContentPieceMember>;
};
const getCanonicalLinkFromPattern = async (
  ctx: Pick<AuthenticatedContext, "db" | "auth">,
  data: { slug: string; variant?: string | null }
): Promise<string> => {
  const workspaceSettingsCollection = getWorkspaceSettingsCollection(ctx.db);
  const workspaceSettings = await workspaceSettingsCollection.findOne({
    workspaceId: ctx.auth.workspaceId
  });
  const pattern = workspaceSettings?.metadata?.canonicalLinkPattern;

  if (!pattern) return "";

  return pattern
    .replace(/{{slug}}/g, data.slug)
    .replace(/{{variant}}/g, data.variant || "")
    .replace(/((?:[^:]))\/\/{1,}/g, (match) => {
      return match.replace(/\/{1,}/g, "/");
    });
};
const createToken = async (
  input: Omit<Token, "id">,
  ctx: AuthenticatedContext,
  extensionId?: ObjectId
): Promise<{ token: UnderscoreID<Token<ObjectId>>; value: string }> => {
  const tokensCollection = getTokensCollection(ctx.db);
  const username = nanoid();
  const password = nanoid();
  const salt = await generateSalt();
  const token: UnderscoreID<FullToken<ObjectId>> = {
    ...input,
    _id: new ObjectId(),
    workspaceId: ctx.auth.workspaceId,
    userId: ctx.auth.userId,
    salt,
    password: await hashValue(password, salt),
    username,
    extensionId
  };

  await tokensCollection.insertOne(token);

  return { token, value: `${username}:${password}` };
};

export {
  stringToRegex,
  extractPreviewDataFromOpenGraph,
  fetchContentPieceTags,
  fetchContentPieceMembers,
  getCanonicalLinkFromPattern,
  createToken
};
