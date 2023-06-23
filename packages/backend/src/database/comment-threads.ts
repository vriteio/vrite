import { Collection, Db, ObjectId } from "mongodb";
import { UnderscoreID, zodId } from "#lib/mongo";
import { z } from "zod";

const commentThread = z.object({
  id: zodId(),
  comments: z.array(zodId()),
  resolved: z.boolean(),
  fragment: z.string(),
  contentPieceId: zodId(),
  date: z.string()
});

interface CommentThread<ID extends string | ObjectId = string>
  extends Omit<z.infer<typeof commentThread>, "id" | "comments" | "contentPieceId" | "date"> {
  id: ID;
  comments: ID[];
  contentPieceId: ID;
  date: ID extends string ? string : Date;
}
interface FullCommentThread<ID extends string | ObjectId = string> extends CommentThread<ID> {
  workspaceId: ID;
}

const getCommentThreadsCollection = (
  db: Db
): Collection<UnderscoreID<FullCommentThread<ObjectId>>> => {
  return db.collection("comment-threads");
};

export { commentThread, getCommentThreadsCollection };
export type { CommentThread };
