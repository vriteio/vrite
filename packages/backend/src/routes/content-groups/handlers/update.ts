import { z } from "zod";
import { AnyBulkWriteOperation, ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import {
  FullContentGroup,
  contentGroup,
  getContentGroupsCollection,
  getWorkspacesCollection
} from "#collections";
import { publishContentGroupEvent } from "#events";
import { errors } from "#lib/errors";
import { UnderscoreID, zodId } from "#lib/mongo";

declare module "fastify" {
  interface RouteCallbacks {
    "contentGroups.update": {
      ctx: AuthenticatedContext;
      data: {
        contentGroup: UnderscoreID<FullContentGroup<ObjectId>>;
        updatedContentGroup: UnderscoreID<FullContentGroup<ObjectId>>;
      };
    };
  }
}

const inputSchema = contentGroup
  .omit({ ancestors: true, descendants: true })
  .partial()
  .required({ id: true })
  .extend({
    ancestor: zodId()
      .or(z.null())
      .describe("ID of the new ancestor for the content group")
      .optional()
  });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const { id, ...update } = input;
  const contentGroupsCollection = getContentGroupsCollection(ctx.db);
  const workspacesCollection = getWorkspacesCollection(ctx.db);
  const contentGroupId = new ObjectId(id);
  const contentGroup = await contentGroupsCollection.findOne({
    _id: contentGroupId,
    workspaceId: ctx.auth.workspaceId
  });

  if (!contentGroup) throw errors.notFound("contentGroup");

  const ancestorChanged = "ancestor" in input;

  let ancestorContentGroup: UnderscoreID<FullContentGroup<ObjectId>> | null = null;

  if (input.ancestor) {
    ancestorContentGroup = await contentGroupsCollection.findOne({
      _id: new ObjectId(input.ancestor),
      workspaceId: ctx.auth.workspaceId
    });

    if (!ancestorContentGroup) throw errors.notFound("contentGroup");
  }

  await contentGroupsCollection.updateOne(
    {
      _id: contentGroupId,
      workspaceId: ctx.auth.workspaceId
    },
    {
      $set: {
        ...update,
        ...(ancestorChanged && {
          ancestors: []
        }),
        ...(ancestorContentGroup && {
          ancestors: [...ancestorContentGroup.ancestors, ancestorContentGroup._id]
        })
      }
    }
  );

  if (ancestorChanged) {
    const descendants = await contentGroupsCollection
      .find({
        ancestors: contentGroup._id
      })
      .toArray();

    if (contentGroup.ancestors.length === 0) {
      await workspacesCollection.updateOne(
        { _id: ctx.auth.workspaceId },
        { $pull: { contentGroups: contentGroup._id } }
      );
    }

    if (!ancestorContentGroup) {
      await workspacesCollection.updateOne(
        { _id: ctx.auth.workspaceId },
        { $push: { contentGroups: contentGroup._id } }
      );
    }

    const contentGroupOperations: Array<
      AnyBulkWriteOperation<UnderscoreID<FullContentGroup<ObjectId>>>
    > = [
      // Remove content group from previous ancestor
      ...((contentGroup.ancestors.length > 0 && [
        {
          updateOne: {
            filter: { _id: contentGroup.ancestors[contentGroup.ancestors.length - 1] },
            update: { $pull: { descendants: contentGroupId } }
          }
        }
      ]) ||
        []),
      // Add content group to new ancestor
      ...((ancestorContentGroup && [
        {
          updateOne: {
            filter: { _id: ancestorContentGroup._id },
            update: { $push: { descendants: contentGroupId } }
          }
        }
      ]) ||
        []),
      // Update descendants
      ...descendants.map((descendant) => {
        const descendantAncestors = [
          ...(ancestorContentGroup?.ancestors || []),
          ...descendant.ancestors.slice(
            descendant.ancestors.findIndex((_id) => contentGroup._id.equals(_id))
          )
        ];

        return {
          updateOne: {
            filter: { _id: descendant._id },
            update: { $set: { ancestors: descendantAncestors } }
          }
        };
      })
    ];

    if (contentGroupOperations.length > 0) {
      await contentGroupsCollection.bulkWrite(contentGroupOperations);
    }
  }

  publishContentGroupEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "update",
    userId: `${ctx.auth.userId}`,
    data: { id, ...update }
  });
  ctx.fastify.routeCallbacks.run("contentGroups.update", ctx, {
    contentGroup,
    updatedContentGroup: {
      ...contentGroup,
      ...update,
      ...(ancestorChanged && {
        ancestors:
          (ancestorContentGroup && [...ancestorContentGroup.ancestors, ancestorContentGroup._id]) ||
          []
      })
    }
  });
};

export { inputSchema, handler };
