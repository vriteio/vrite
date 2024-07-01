import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { ContentGroup, contentGroup, getContentGroupsCollection } from "#collections";
import { errors } from "#lib/errors";
import { UnderscoreID } from "#lib/mongo";

type ContentGroupWithSubtree = Omit<ContentGroup, "descendants"> & {
  descendants: ContentGroupWithSubtree[];
};

const contentGroupWithSubtree: z.ZodType<ContentGroupWithSubtree> = contentGroup.extend({
  descendants: z.array(z.lazy(() => contentGroupWithSubtree))
});
const inputSchema = contentGroup
  .pick({
    id: true
  })
  .extend({
    subtree: z.boolean().describe("Whether to list the entire subtree of the group").optional()
  });
const outputSchema = contentGroup.or(contentGroupWithSubtree);
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const contentGroupsCollection = getContentGroupsCollection(ctx.db);
  const contentGroup = await contentGroupsCollection.findOne({
    _id: new ObjectId(input.id),
    workspaceId: ctx.auth.workspaceId
  });

  if (!contentGroup) throw errors.notFound("contentGroup");

  if (input.subtree) {
    const contentGroupsById = new Map<string, UnderscoreID<ContentGroup<ObjectId>>>();
    const contentGroups = await contentGroupsCollection
      .find({
        workspaceId: ctx.auth.workspaceId,
        ancestors: contentGroup._id
      })
      .toArray();
    const processContentGroupsList = (
      contentGroupIds: Array<ObjectId | string>
    ): ContentGroupWithSubtree[] => {
      return contentGroupIds
        .map((id) => {
          const contentGroup = contentGroupsById.get(`${id}`);

          if (!contentGroup) return null;

          return {
            id: `${contentGroup._id}`,
            name: contentGroup.name,
            descendants: processContentGroupsList(contentGroup.descendants),
            ancestors: contentGroup.ancestors.map((id) => `${id}`)
          };
        })
        .filter(Boolean) as ContentGroupWithSubtree[];
    };

    contentGroups.forEach((contentGroup) => {
      contentGroupsById.set(`${contentGroup._id}`, contentGroup);
    });

    return {
      id: `${contentGroup._id}`,
      name: contentGroup.name,
      descendants: processContentGroupsList(contentGroup.descendants),
      ancestors: contentGroup.ancestors.map((id) => `${id}`)
    };
  }

  return {
    id: `${contentGroup._id}`,
    ancestors: contentGroup.ancestors.map((id) => `${id}`),
    descendants: contentGroup.descendants.map((id) => `${id}`),
    name: contentGroup.name
  };
};

export { inputSchema, outputSchema, handler };
