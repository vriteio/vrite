import {
  gfmInputTransformer,
  gfmOutputTransformer,
  InputTransformer
} from "@vrite/sdk/transformers";
import { ObjectId, Binary } from "mongodb";
import { convert as convertToSlug } from "url-slug";
import crypto from "node:crypto";
import { FullContentPiece, FullContents, GitHubData } from "#database";
import { UnderscoreID, jsonToBuffer, htmlToJSON, bufferToJSON } from "#lib";

const processInputContent = (
  inputContent: string,
  _githubData: GitHubData
): {
  buffer: Buffer;
  contentHash: string;
  metadata: Partial<
    Pick<FullContentPiece, keyof NonNullable<ReturnType<InputTransformer>["contentPiece"]>>
  >;
} => {
  const { content, contentPiece } = gfmInputTransformer(inputContent);
  const buffer = jsonToBuffer(htmlToJSON(content || "<p></p>"));
  const metadata = contentPiece || {};
  const contentHash = crypto.createHash("md5").update(inputContent).digest("hex");

  return {
    buffer,
    metadata,
    contentHash
  };
};
const processOutputContent = (
  buffer: Buffer,
  contentPiece: UnderscoreID<FullContentPiece<ObjectId>>,
  _githubData: GitHubData
): string => {
  return gfmOutputTransformer(bufferToJSON(buffer), {
    coverWidth: contentPiece.coverWidth || "100%",
    members: contentPiece.members.map((memberId) => `${memberId}`),
    tags: contentPiece.tags.map((tagId) => `${tagId}`),
    canonicalLink: contentPiece.canonicalLink || undefined,
    filename: contentPiece.filename || undefined,
    coverAlt: contentPiece.coverAlt || undefined,
    coverUrl: contentPiece.coverUrl || undefined,
    description: contentPiece.description || undefined,
    customData: contentPiece.customData,
    date: contentPiece.date?.toISOString(),
    title: contentPiece.title,
    slug: contentPiece.slug
  });
};
const createSyncedPiece = (
  details: {
    path: string;
    content: string;
    workspaceId: ObjectId;
    contentGroupId: ObjectId;
    order: string;
  },
  githubData: GitHubData
): {
  contentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
  content: UnderscoreID<FullContents<ObjectId>>;
  contentHash: string;
} => {
  const filename = details.path.split("/").pop() || "";
  const { buffer, contentHash, metadata } = processInputContent(details.content || "", githubData);
  const { members, tags, date, ...inputMetadata } = metadata;
  const contentPiece: UnderscoreID<FullContentPiece<ObjectId>> = {
    _id: new ObjectId(),
    workspaceId: details.workspaceId,
    contentGroupId: details.contentGroupId,
    order: details.order,
    members: [],
    slug: convertToSlug(filename),
    tags: [],
    title: filename,
    filename,
    ...inputMetadata,
    ...(date && { date: new Date(date) }),
    ...(members && { members: members.map((memberId) => new ObjectId(memberId)) }),
    ...(tags && { tags: tags.map((tagId) => new ObjectId(tagId)) })
  };
  const content = {
    _id: new ObjectId(),
    contentPieceId: contentPiece._id,
    workspaceId: details.workspaceId,
    content: new Binary(buffer)
  };

  return {
    contentPiece,
    contentHash,
    content
  };
};

export { createSyncedPiece, processInputContent, processOutputContent };
