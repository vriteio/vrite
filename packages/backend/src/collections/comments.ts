import { Profile, profile } from "./users";
import { Collection, Db, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";

const comment = z.object({
  id: zodId().describe("ID of the comment"),
  memberId: zodId().describe("ID of the workspace member who made the comment"),
  threadId: zodId().describe("ID of the thread the comment is a part of"),
  content: z.string().describe("HTML content of the comment"),
  date: z.string().describe("Date the comment was created"),
  contentPieceId: zodId()
    .optional()
    .describe("ID of the content piece the comment is associated with"),
  variantId: zodId().optional().describe("ID of the variant the comment is associated with")
});
const commentMember = z.object({
  id: zodId(),
  profile: profile.omit({ bio: true })
});

interface CommentMember<ID extends string | ObjectId = string> {
  id: ID;
  profile: Omit<Profile<ID>, "bio">;
}
interface Comment<ID extends string | ObjectId = string>
  extends Omit<
    z.infer<typeof comment>,
    "id" | "memberId" | "threadId" | "date" | "contentPieceId" | "variantId"
  > {
  id: ID;
  memberId: ID;
  threadId: ID;
  date: ID extends string ? string : Date;
  contentPieceId?: ID;
  variantId?: ID;
}
interface CommentWithAdditionalData<ID extends string | ObjectId = string>
  extends Omit<Comment<ID>, "memberId"> {
  member: CommentMember<ID> | null;
}
interface FullComment<ID extends string | ObjectId = string> extends Comment<ID> {
  workspaceId: ID;
}
interface FullCommentWithAdditionalData<ID extends string | ObjectId = string>
  extends Omit<FullComment<ID>, "memberId"> {
  member: CommentMember<ID>;
}

const getCommentsCollection = (db: Db): Collection<UnderscoreID<FullComment<ObjectId>>> => {
  return db.collection("comments");
};

export { comment, commentMember, getCommentsCollection };
export type {
  Comment,
  CommentMember,
  CommentWithAdditionalData,
  FullComment,
  FullCommentWithAdditionalData
};
