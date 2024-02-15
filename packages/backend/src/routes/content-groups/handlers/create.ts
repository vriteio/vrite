import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import {
  contentGroup,
  getContentGroupsCollection,
  getWorkspacesCollection,
  FullContentGroup
} from "#collections";
import { publishContentGroupEvent } from "#events";
import { errors } from "#lib/errors";
import { zodId, UnderscoreID } from "#lib/mongo";

declare module "fastify" {
  interface RouteCallbacks {
    "contentGroups.create": {
      ctx: AuthenticatedContext;
      data: {
        contentGroup: UnderscoreID<FullContentGroup<ObjectId>>;
      };
    };
  }
}

const inputSchema = contentGroup.omit({ descendants: true, ancestors: true, id: true }).extend({
  ancestor: zodId().optional().describe("ID of the content group to be the direct ancestor")
});
const outputSchema = contentGroup.pick({ id: true });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const contentGroupsCollection = getContentGroupsCollection(ctx.db);
  const workspacesCollection = getWorkspacesCollection(ctx.db);
  const ancestor =
    input.ancestor &&
    (await contentGroupsCollection.findOne({
      _id: new ObjectId(input.ancestor),
      workspaceId: ctx.auth.workspaceId
    }));

  if (input.ancestor && !ancestor) throw errors.notFound("contentGroup");

  const contentGroup: UnderscoreID<FullContentGroup<ObjectId>> = {
    name: input.name,
    descendants: [],
    workspaceId: ctx.auth.workspaceId,
    _id: new ObjectId(),
    ancestors: [],
    ...(ancestor && {
      ancestors: [...ancestor.ancestors, ancestor._id]
    })
  };

  if (ancestor) {
    const { matchedCount } = await contentGroupsCollection.updateOne(
      { _id: ancestor._id },
      { $push: { descendants: contentGroup._id } }
    );

    if (!matchedCount) throw errors.notFound("contentGroup");
  } else {
    await workspacesCollection.updateOne(
      { _id: ctx.auth.workspaceId },
      { $push: { contentGroups: contentGroup._id } }
    );
  }

  await contentGroupsCollection.insertOne(contentGroup);
  publishContentGroupEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "create",
    userId: `${ctx.auth.userId}`,
    data: {
      id: `${contentGroup._id}`,
      ancestors: contentGroup.ancestors.map((id) => `${id}`),
      descendants: contentGroup.descendants.map((id) => `${id}`),
      ...input
    }
  });
  ctx.fastify.routeCallbacks.run("contentGroups.create", ctx, {
    contentGroup
  });

  return { id: `${contentGroup._id}` };
};

export { inputSchema, outputSchema, handler };
