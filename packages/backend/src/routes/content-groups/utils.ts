import { ObjectId } from "mongodb";
import { ContentGroup } from "#collections";
import { FullContentGroup } from "#collections";
import { UnderscoreID } from "#lib";

const rearrangeContentGroups = (
  contentGroups: Array<UnderscoreID<FullContentGroup<ObjectId>>>,
  ids: ObjectId[]
): ContentGroup[] => {
  return ids
    .map((id) => {
      const contentGroup = contentGroups.find((contentGroup) => {
        return contentGroup._id.equals(id);
      });

      if (!contentGroup) return null;

      return {
        id: `${contentGroup!._id}`,
        descendants: contentGroup.descendants.map((id) => `${id}`),
        ancestors: contentGroup.ancestors.map((id) => `${id}`),
        name: contentGroup.name
      };
    })
    .filter(Boolean) as ContentGroup[];
};

export { rearrangeContentGroups };
