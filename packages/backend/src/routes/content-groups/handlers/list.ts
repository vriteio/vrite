import { rearrangeContentGroups } from "../utils";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import {
  ContentGroup,
  contentGroup,
  getContentGroupsCollection,
  getWorkspacesCollection
} from "#collections";
import { errors } from "#lib/errors";
import { UnderscoreID, zodId } from "#lib/mongo";

type ContentGroupWithSubtree = Omit<ContentGroup, "descendants"> & {
  descendants: ContentGroupWithSubtree[];
};

const contentGroupWithSubtree: z.ZodType<ContentGroupWithSubtree> = contentGroup.extend({
  descendants: z.array(z.lazy(() => contentGroupWithSubtree))
});
const inputSchema = z
  .object({
    ancestor: zodId().describe("ID of the content group to list descendants for").optional(),
    subtree: z.boolean().describe("Whether to list the entire subtree of the group").optional()
  })
  .optional();
const outputSchema = z.array(contentGroup).or(z.array(contentGroupWithSubtree));
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const contentGroupsCollection = getContentGroupsCollection(ctx.db);
  const workspacesCollection = getWorkspacesCollection(ctx.db);
  const topLevelIds: ObjectId[] = [];
  const ancestorId = input?.ancestor ? new ObjectId(input.ancestor) : null;

  if (ancestorId) {
    const ancestor = await contentGroupsCollection.findOne({ _id: ancestorId });

    if (!ancestor) throw errors.notFound("contentGroup");

    topLevelIds.push(...ancestor.descendants);
  } else {
    const workspace = await workspacesCollection.findOne({ _id: ctx.auth.workspaceId });

    if (!workspace) throw errors.notFound("workspace");

    topLevelIds.push(...workspace.contentGroups);
  }

  if (input?.subtree) {
    // No ancestor
    const contentGroupsById = new Map<string, UnderscoreID<ContentGroup<ObjectId>>>();
    const contentGroups = await contentGroupsCollection
      .find({
        workspaceId: ctx.auth.workspaceId,
        ...(ancestorId && { ancestors: ancestorId })
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

    return processContentGroupsList(topLevelIds);
  } else {
    const contentGroups = await contentGroupsCollection
      .find({
        workspaceId: ctx.auth.workspaceId,
        _id: { $in: topLevelIds }
      })
      .toArray();

    return rearrangeContentGroups(contentGroups, topLevelIds);
  }
};

export { inputSchema, outputSchema, handler };
