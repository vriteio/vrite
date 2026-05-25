import { entriesDB, FullEntry } from "#backend/db";
import { toObjectID, UnderscoreID } from "#backend/lib/mongo";
import { status } from "elysia";
import { ObjectId } from "mongodb";
import { LexoRank } from "lexorank";

const moveEntry = async (input: {
  id: string;
  workspaceID: string;
  precedingEntryID?: string;
  followingEntryID?: string;
}) => {
  const workspaceID = toObjectID(input.workspaceID);
  const entry = await entriesDB.findOne({
    _id: toObjectID(input.id),
    workspaceID
  });

  let precedingEntry: UnderscoreID<FullEntry<ObjectId>> | null = null;
  let followingEntry: UnderscoreID<FullEntry<ObjectId>> | null = null;
  let newOrder = "";

  if (!entry) throw status("Not Found");

  if (input.precedingEntryID) {
    precedingEntry = await entriesDB.findOne({
      _id: toObjectID(input.precedingEntryID),
      workspaceID
    });

    if (!precedingEntry) throw status("Not Found");
  }

  if (input.followingEntryID) {
    followingEntry = await entriesDB.findOne({
      _id: toObjectID(input.followingEntryID),
      workspaceID
    });

    if (!followingEntry) throw status("Not Found");
  }

  if (!followingEntry && precedingEntry) {
    newOrder = LexoRank.parse(precedingEntry.order).genPrev().toString();
  } else if (!precedingEntry && followingEntry) {
    newOrder = LexoRank.parse(followingEntry.order).genNext().toString();
  } else if (followingEntry && precedingEntry) {
    newOrder = LexoRank.parse(precedingEntry.order)
      .between(LexoRank.parse(followingEntry.order))
      .toString();
  } else if (entry) {
    const [lastEntry] = await entriesDB.find().sort({ order: -1 }).limit(1).toArray();

    followingEntry = lastEntry || null;

    if (lastEntry && `${entry._id}` !== `${lastEntry._id}`) {
      newOrder = LexoRank.parse(lastEntry.order).genNext().toString();
    } else {
      newOrder = LexoRank.min().toString();
    }
  }

  if (newOrder !== entry.order) {
    await entriesDB.updateOne({ _id: toObjectID(input.id) }, { $set: { order: newOrder } });
  }
};

export { moveEntry };
