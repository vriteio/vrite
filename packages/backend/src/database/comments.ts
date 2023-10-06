import { Profile, profile } from "./users";
import { Collection, Db, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";

const comment = z.object({
  id: zodId(),
  memberId: zodId(),
  threadId: zodId(),
  content: z.string(),
  date: z.string()
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
  extends Omit<z.infer<typeof comment>, "id" | "memberId" | "threadId" | "date"> {
  id: ID;
  memberId: ID;
  threadId: ID;
  date: ID extends string ? string : Date;
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
