import { Collection, Db, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";

const tagColor = z.enum([
  "gray",
  "red",
  "pink",
  "orange",
  "amber",
  "purple",
  "indigo",
  "blue",
  "cyan",
  "green",
  "teal",
  "lime",
  "fuchsia",
  "emerald"
]);
const tag = z.object({
  id: zodId(),
  label: z.string().min(1).max(20).describe("Label describing the tag"),
  color: tagColor.default("gray").describe("Tag color name")
});

interface Tag<ID extends string | ObjectId = string> extends Omit<z.infer<typeof tag>, "id"> {
  id: ID;
}
interface FullTag<ID extends string | ObjectId = string> extends Tag<ID> {
  value: string;
  workspaceId: ID;
}
type TagColor = z.infer<typeof tagColor>;
type ExtendedTag<
  K extends keyof Omit<FullTag, keyof Tag> | undefined = undefined,
  ID extends string | ObjectId = string
> = Tag & Pick<FullTag<ID>, Exclude<K, undefined>>;

const getTagsCollection = (db: Db): Collection<UnderscoreID<FullTag<ObjectId>>> => {
  return db.collection("tags");
};

export { tag, getTagsCollection };
export type { Tag, FullTag, TagColor, ExtendedTag };
