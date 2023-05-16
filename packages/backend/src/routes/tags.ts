import { ObjectId } from "mongodb";
import { z } from "zod";
import { zodId } from "#lib/mongo";
import { stringToRegex } from "#lib/utils";
import { isAuthenticated } from "#lib/middleware";
import { procedure, router } from "#lib/trpc";
import * as errors from "#lib/errors";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";
import { ExtendedTag, Tag, getTagsCollection, tag, getContentPiecesCollection } from "#database";

type TagEvent =
  | { action: "create"; data: Tag }
  | { action: "update"; data: Partial<Tag> & { id: string } }
  | {
      action: "delete";
      data: { id: string };
    };

const authenticatedProcedure = procedure.use(isAuthenticated);
const basePath = "/tags";
const publishEvent = createEventPublisher<TagEvent>((workspaceId) => `tags:${workspaceId}`);
const tagsRouter = router({
  get: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: basePath, protect: true },
      permissions: { token: ["tags:read"] }
    })
    .input(z.object({ id: zodId() }))
    .output(tag)
    .query(async ({ input, ctx }) => {
      const tagsCollection = getTagsCollection(ctx.db);
      const tag = await tagsCollection.findOne({
        workspaceId: ctx.auth.workspaceId,
        ...(input.id ? { _id: new ObjectId(input.id) } : {})
      });

      if (!tag) throw errors.notFound("tag");

      return {
        label: tag.label,
        color: tag.color,
        id: `${tag._id}`
      };
    }),
  update: authenticatedProcedure
    .meta({
      openapi: { method: "PUT", path: basePath, protect: true },
      permissions: { session: ["editMetadata"], token: ["tags:write"] }
    })
    .input(tag.partial().required({ id: true }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const tagsCollection = getTagsCollection(ctx.db);
      const { id, ...update } = input;
      const tagUpdate: Partial<ExtendedTag<"value">> = {
        ...update
      };

      if (update.label) {
        tagUpdate.value = (update.label || "").toLowerCase().replace(/\s/g, "_");
      }

      const { matchedCount } = await tagsCollection.updateOne(
        {
          workspaceId: ctx.auth.workspaceId,
          _id: new ObjectId(id)
        },
        {
          $set: tagUpdate
        }
      );

      if (!matchedCount) throw errors.notFound("tag");

      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "update",
        data: input
      });
    }),
  create: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: basePath, protect: true },
      permissions: { session: ["editMetadata"], token: ["tags:write"] }
    })
    .input(tag.omit({ id: true }))
    .output(z.object({ id: zodId() }))
    .mutation(async ({ ctx, input }) => {
      const tagsCollection = getTagsCollection(ctx.db);
      const tag = {
        ...input,
        _id: new ObjectId(),
        workspaceId: ctx.auth.workspaceId,
        value: (input.label || "").toLowerCase().replace(/\s/g, "_")
      };

      await tagsCollection.insertOne(tag);
      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "create",
        data: {
          ...input,
          id: `${tag._id}`
        }
      });

      return { id: `${tag._id}` };
    }),
  list: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: `${basePath}/list`, protect: true },
      permissions: { token: ["tags:read"] }
    })
    .input(
      z.object({
        perPage: z.number().default(20),
        page: z.number().default(1)
      })
    )
    .output(z.array(tag))
    .query(async ({ ctx, input }) => {
      const tagsCollection = getTagsCollection(ctx.db);
      const tags = await tagsCollection
        .find({
          workspaceId: ctx.auth.workspaceId
        })
        .sort("_id", -1)
        .skip((input.page - 1) * input.perPage)
        .limit(input.perPage)
        .toArray();

      return tags.map((tag) => {
        return { ...tag, id: `${tag._id}` };
      });
    }),
  delete: authenticatedProcedure
    .meta({
      openapi: { method: "DELETE", path: basePath, protect: true },
      permissions: { session: ["editMetadata"], token: ["tags:write"] }
    })
    .input(z.object({ id: zodId() }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const tagsCollection = getTagsCollection(ctx.db);
      const contentPiecesCollection = getContentPiecesCollection(ctx.db);
      const tagId = new ObjectId(input.id);
      const { deletedCount } = await tagsCollection.deleteOne({
        workspaceId: ctx.auth.workspaceId,
        _id: tagId
      });

      if (!deletedCount) throw errors.notFound("tag");

      await contentPiecesCollection.updateMany(
        {
          workspaceId: ctx.auth.workspaceId,
          tags: tagId
        },
        {
          $pull: {
            tags: tagId
          }
        }
      );
      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "delete",
        data: { id: input.id }
      });
    }),
  search: authenticatedProcedure
    .input(
      z.object({
        query: z.string().optional()
      })
    )
    .output(z.array(tag))
    .query(async ({ ctx, input }) => {
      const tagsCollection = getTagsCollection(ctx.db);
      const tags = await tagsCollection
        .find({
          workspaceId: ctx.auth.workspaceId,
          ...(input.query ? { value: stringToRegex(input.query) } : {})
        })
        .limit(10)
        .sort("_id", -1)
        .toArray();

      return tags.map((tag) => {
        return { ...tag, id: `${tag._id}` };
      });
    }),
  changes: authenticatedProcedure.input(z.void()).subscription(({ ctx }) => {
    return createEventSubscription<TagEvent>(ctx, `tags:${ctx.auth.workspaceId}`);
  })
});

export { tagsRouter };
