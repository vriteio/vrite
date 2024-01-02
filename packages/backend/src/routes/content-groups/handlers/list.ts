import { rearrangeContentGroups } from "../utils";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { contentGroup, getContentGroupsCollection, getWorkspacesCollection } from "#collections";
import { errors } from "#lib/errors";
import { zodId } from "#lib/mongo";

const inputSchema = z
  .object({
    ancestor: zodId().optional()
  })
  .optional();
const outputSchema = z.array(contentGroup);
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const contentGroupsCollection = getContentGroupsCollection(ctx.db);
  const workspacesCollection = getWorkspacesCollection(ctx.db);
  const ids: ObjectId[] = [];
  const ancestorId = input?.ancestor ? new ObjectId(input.ancestor) : null;

  if (ancestorId) {
    const ancestor = await contentGroupsCollection.findOne({ _id: ancestorId });

    if (!ancestor) throw errors.notFound("contentGroup");

    ids.push(...ancestor.descendants);
  } else {
    const workspace = await workspacesCollection.findOne({ _id: ctx.auth.workspaceId });

    if (!workspace) throw errors.notFound("workspace");

    ids.push(...workspace.contentGroups);
  }

  const contentGroups = await contentGroupsCollection
    .find({
      workspaceId: ctx.auth.workspaceId,
      _id: { $in: ids }
    })
    .toArray();

  return rearrangeContentGroups(contentGroups, ids);
};

export { inputSchema, outputSchema, handler };
