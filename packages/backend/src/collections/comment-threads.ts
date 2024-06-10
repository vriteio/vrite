import { Collection, Db, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";

const commentThread = z.object({
  id: zodId().describe("ID of the comment thread"),
  comments: z.array(zodId()).describe("IDs of the comments in the thread"),
  resolved: z.boolean().describe("Whether the thread has been resolved"),
  fragment: z
    .string()
    .describe("ID marking a fragment of content that the thread is associated with"),
  contentPieceId: zodId().describe("ID of the content piece that the thread is associated with"),
  variantId: zodId().describe("ID of the variant that the thread is associated with").optional(),
  initialContent: z.string().describe("Initial HTML content of the commented fragment").optional(),
  date: z.string().describe("Date the thread was created")
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
