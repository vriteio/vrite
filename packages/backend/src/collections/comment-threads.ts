import { Collection, Db, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";

const commentThread = z.object({
  id: zodId(),
  comments: z.array(zodId()),
  resolved: z.boolean(),
  fragment: z.string(),
  contentPieceId: zodId(),
  variantId: zodId().optional(),
  date: z.string()
});

interface CommentThread<ID extends string | ObjectId = string>
  extends Omit<
    z.infer<typeof commentThread>,
    "id" | "comments" | "contentPieceId" | "variantId" | "date"
  > {
  id: ID;
  comments: ID[];
  contentPieceId: ID;
  variantId?: ID;
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
