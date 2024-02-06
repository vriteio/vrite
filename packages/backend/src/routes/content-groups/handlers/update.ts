import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { FullContentGroup, contentGroup, getContentGroupsCollection } from "#collections";
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
  .extend({ ancestor: zodId().optional() });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const { id, ...update } = input;
  const contentGroupsCollection = getContentGroupsCollection(ctx.db);
  const contentGroupId = new ObjectId(id);
  const contentGroup = await contentGroupsCollection.findOne({
    _id: contentGroupId,
    workspaceId: ctx.auth.workspaceId
  });

  if (!contentGroup) throw errors.notFound("contentGroup");

  const ancestorContentGroup =
    "ancestor" in input &&
    (await contentGroupsCollection.findOne({
      _id: new ObjectId(input.ancestor),
      workspaceId: ctx.auth.workspaceId
    }));

  if ("ancestor" in input && !ancestorContentGroup) throw errors.notFound("contentGroup");

  await contentGroupsCollection.updateOne(
    {
      _id: contentGroupId,
      workspaceId: ctx.auth.workspaceId
    },
    {
      $set: {
        ...update,
        ...(ancestorContentGroup && {
          ancestors: [...ancestorContentGroup.ancestors, ancestorContentGroup._id]
        })
      }
    }
  );

  if (ancestorContentGroup) {
    const descendants = await contentGroupsCollection
      .find({
        ancestors: contentGroup._id
      })
      .toArray();

    await contentGroupsCollection.bulkWrite([
      {
        updateOne: {
          filter: { _id: contentGroup.ancestors[contentGroup.ancestors.length - 1] },
          update: { $pull: { descendants: contentGroupId } }
        }
      },
      {
        updateOne: {
          filter: { _id: ancestorContentGroup._id },
          update: { $push: { descendants: contentGroupId } }
        }
      },
      ...descendants.map((descendant) => {
        const descendantAncestors = [
          ...ancestorContentGroup.ancestors,
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
    ]);
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
      ...(ancestorContentGroup && {
        ancestors: [...ancestorContentGroup.ancestors, ancestorContentGroup._id]
      })
    }
  });
};

export { inputSchema, handler };
