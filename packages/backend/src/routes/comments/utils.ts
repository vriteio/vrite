import { Db, ObjectId } from "mongodb";
import {
  CommentWithAdditionalData,
  getWorkspaceMembershipsCollection,
  getUsersCollection,
  CommentThread,
  Comment,
  getCommentsCollection
} from "#collections";
import { UnderscoreID } from "#lib/mongo";

const fetchCommentsMembers = async (
  db: Db,
  comments: Array<UnderscoreID<Comment<ObjectId>>>
): Promise<Array<CommentWithAdditionalData>> => {
  const memberIds = comments.map((comment) => comment.memberId) || [];
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

  return comments.map((comment) => {
    const membership = memberships.find(
      (membership) => `${membership._id}` === `${comment.memberId}`
    );
    const user = users.find((user) => {
      if (!membership?.userId) return false;

      return user._id.equals(membership?.userId);
    });

    return {
      ...comment,
      id: `${comment._id}`,
      date: comment.date.toISOString(),
      threadId: `${comment.threadId}`,
      contentPieceId: `${comment.contentPieceId}`,
      member: null,
      variantId: undefined,
      ...(comment.variantId && { variantId: `${comment.variantId}` }),
      ...(membership &&
        user && {
          member: {
            id: `${membership._id}`,
            profile: {
              id: `${user._id}`,
              email: user.email,
              avatar: user.avatar,
              username: user.username,
              fullName: user.fullName
            }
          }
        })
    };
  });
};
const fetchThreadsFirstComments = async (
  db: Db,
  threads: Array<UnderscoreID<CommentThread<ObjectId>>>
): Promise<Array<CommentWithAdditionalData>> => {
  const commentIds = threads.map((thread) => thread.comments[0] || null).filter((value) => value);
  const commentsCollection = getCommentsCollection(db);
  const comments = await commentsCollection.find({ _id: { $in: commentIds } }).toArray();

  return fetchCommentsMembers(db, comments);
};

export { fetchCommentsMembers, fetchThreadsFirstComments };
