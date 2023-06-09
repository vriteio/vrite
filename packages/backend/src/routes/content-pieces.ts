import { Binary, Db, ObjectId } from "mongodb";
import { z } from "zod";
import { LexoRank } from "lexorank";
import { convert as convertToSlug } from "url-slug";
import { convert as convertToText } from "html-to-text";
import { stringToRegex } from "#lib/utils";
import { UnderscoreID, zodId } from "#lib/mongo";
import { bufferToJSON, DocJSON, htmlToJSON, jsonToBuffer } from "#lib/processing";
import { isAuthenticated } from "#lib/middleware";
import { procedure, router } from "#lib/trpc";
import {
  contentPiece,
  ContentPiece,
  ContentPieceMember,
  contentPieceMember,
  FullContentPiece,
  FullContentPieceWithAdditionalData,
  getContentPiecesCollection
} from "#database/content-pieces";
import { Tag, getTagsCollection, tag } from "#database/tags";
import { getWorkspacesCollection } from "#database/workspaces";
import * as errors from "#lib/errors";
import { getContentsCollection } from "#database/contents";
import { runWebhooks } from "#lib/webhooks";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";
import {
  getUsersCollection,
  getWorkspaceMembershipsCollection,
  getWorkspaceSettingsCollection
} from "#database";

type ContentPieceEvent =
  | { action: "delete"; userId: string; data: { id: string } }
  | { action: "create"; userId: string; data: FullContentPieceWithAdditionalData }
  | {
      action: "update";
      userId: string;
      data: Partial<FullContentPieceWithAdditionalData> & { id: string };
    }
  | {
      action: "move";
      userId: string;
      data: {
        contentPiece: FullContentPieceWithAdditionalData;
        nextReferenceId?: string;
        previousReferenceId?: string;
      };
    };

const publishEvent = createEventPublisher<ContentPieceEvent>((contentGroupId) => {
  return `contentPieces:${contentGroupId}`;
});
const webhookPayload = (
  contentPiece: UnderscoreID<FullContentPiece<ObjectId>>
): ContentPiece & { id: string; locked?: boolean } => {
  return {
    ...contentPiece,
    id: `${contentPiece._id}`,
    tags: contentPiece.tags.map((tag) => `${tag}`),
    members: contentPiece.members?.map((member) => `${member}`) || [],
    contentGroupId: `${contentPiece.contentGroupId}`,
    date: contentPiece.date?.toISOString()
  };
};
const fetchContentPieceTags = async (
  db: Db,
  contentPiece: UnderscoreID<ContentPiece<ObjectId>>
): Promise<Tag[]> => {
  const tagsCollection = getTagsCollection(db);
  const tags = await tagsCollection.find({ _id: { $in: contentPiece.tags } }).toArray();

  return contentPiece.tags
    .map((tagId) => {
      const { _id, workspaceId, ...tag } = tags.find((tag) => `${tag._id}` === `${tagId}`) || {};

      if (!_id) return null;

      return { ...tag, id: `${_id}` };
    })
    .filter((value) => value) as Tag[];
};
const fetchContentPieceMembers = async (
  db: Db,
  contentPiece: UnderscoreID<ContentPiece<ObjectId>>
): Promise<Array<ContentPieceMember>> => {
  const memberIds = contentPiece.members || [];
  const workspaceMembershipsCollection = getWorkspaceMembershipsCollection(db);
  const usersCollection = getUsersCollection(db);
  const memberships = await workspaceMembershipsCollection
    .find({ _id: { $in: memberIds } })
    .toArray();
  const users = await usersCollection
    .find({
      _id: {
        $in: memberships
          .map((membership) => membership.userId)
          .filter((value) => value) as ObjectId[]
      }
    })
    .toArray();

  return memberIds
    .map((membershipId) => {
      const membership = memberships.find(
        (membership) => `${membership._id}` === `${membershipId}`
      );
      const user = users.find((user) => {
        if (!membership?.userId) return false;

        return user._id.equals(membership?.userId);
      });

      if (!membership || !user) return null;

      return {
        id: `${membership._id}`,
        profile: {
          id: `${user._id}`,
          email: user.email,
          avatar: user.avatar,
          username: user.username,
          fullName: user.fullName
        }
      };
    })
    .filter((value) => value) as Array<ContentPieceMember>;
};
const basePath = "/content-pieces";
const authenticatedProcedure = procedure.use(isAuthenticated);
const contentPiecesRouter = router({
  get: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: basePath, protect: true },
      permissions: { token: ["contentPieces:read"] }
    })
    .input(
      z.object({
        id: zodId(),
        content: z.boolean().default(false),
        description: z.enum(["html", "text"]).default("html")
      })
    )
    .output(
      contentPiece.omit({ tags: true }).extend({
        tags: z.array(tag),
        members: z.array(contentPieceMember),
        slug: z.string(),
        locked: z.boolean(),
        coverWidth: z.string().optional(),
        content: z.record(z.string(), z.any()).optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const workspaceSettingsCollection = getWorkspaceSettingsCollection(ctx.db);
      const contentPiecesCollection = getContentPiecesCollection(ctx.db);
      const workspacesCollection = getWorkspacesCollection(ctx.db);
      const workspaceSettings = await workspaceSettingsCollection.findOne({
        workspaceId: ctx.auth.workspaceId
      });
      const workspace = await workspacesCollection.findOne({ _id: ctx.auth.workspaceId });
      const contentPiece = await contentPiecesCollection.findOne({
        _id: new ObjectId(input.id)
      });

      if (!contentPiece) throw errors.notFound("contentPiece");

      const contentGroup = workspace?.contentGroups.find((contentGroup) => {
        return contentGroup._id.equals(contentPiece.contentGroupId);
      });

      if (!contentGroup) {
        throw errors.incomplete("contentPiece");
      }

      let content: DocJSON | null = null;

      if (input.content) {
        const contentsCollection = await getContentsCollection(ctx.db);
        const contents = await contentsCollection.findOne({
          contentPieceId: new ObjectId(input.id)
        });

        if (contents && contents.content) {
          content = bufferToJSON(Buffer.from(contents.content.buffer));
        } else {
          content = { type: "doc", content: [] };
        }
      }

      const tags = await fetchContentPieceTags(ctx.db, contentPiece);
      const members = await fetchContentPieceMembers(ctx.db, contentPiece);
      const getDescription = (): string => {
        if (input.description === "html") {
          return contentPiece.description || "";
        }

        return convertToText(contentPiece.description || "", { wordwrap: false });
      };

      return {
        ...contentPiece,
        ...(workspaceSettings?.metadata?.canonicalLinkPattern &&
          typeof contentPiece.canonicalLink !== "string" && {
            canonicalLink: workspaceSettings.metadata.canonicalLinkPattern.replace(
              /{{slug}}/g,
              contentPiece.slug
            )
          }),
        id: `${contentPiece._id}`,
        description: getDescription(),
        contentGroupId: `${contentPiece.contentGroupId}`,
        locked: contentGroup?.locked || false,
        workspaceId: `${contentPiece.workspaceId}`,
        date: contentPiece.date?.toISOString(),
        tags,
        members,
        ...(content ? { content } : {})
      };
    }),
  list: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: `${basePath}/list`, protect: true },
      permissions: { token: ["contentPieces:read"] }
    })
    .input(
      z.object({
        contentGroupId: zodId(),
        slug: z.string().optional(),
        tagId: zodId().optional(),
        lastOrder: z.string().optional(),
        perPage: z.number().default(20),
        page: z.number().default(1)
      })
    )
    .output(
      z.array(
        contentPiece.omit({ tags: true }).extend({
          slug: z.string(),
          tags: z.array(tag),
          members: z.array(contentPieceMember),
          locked: z.boolean(),
          order: z.string()
        })
      )
    )
    .query(async ({ ctx, input }) => {
      const workspaceSettingsCollection = getWorkspaceSettingsCollection(ctx.db);
      const contentPiecesCollection = getContentPiecesCollection(ctx.db);
      const workspacesCollection = getWorkspacesCollection(ctx.db);
      const workspaceSettings = await workspaceSettingsCollection.findOne({
        workspaceId: ctx.auth.workspaceId
      });
      const workspace = await workspacesCollection.findOne({
        _id: ctx.auth.workspaceId
      });
      const contentGroup = workspace?.contentGroups.find((contentGroup) => {
        return contentGroup._id.equals(input.contentGroupId);
      });

      if (!contentGroup) {
        throw errors.incomplete("contentPiece");
      }

      const cursor = contentPiecesCollection
        .find({
          workspaceId: ctx.auth.workspaceId,
          ...(input.contentGroupId ? { contentGroupId: new ObjectId(input.contentGroupId) } : {}),
          ...(input.tagId ? { tags: new ObjectId(input.tagId) } : {}),
          ...(input.slug ? { slug: stringToRegex(input.slug) } : {}),
          ...(input.lastOrder ? { order: { $lt: input.lastOrder } } : {})
        })
        .sort({ order: -1 });

      if (!input.lastOrder) {
        cursor.skip((input.page - 1) * input.perPage);
      }

      const contentPieces = await cursor.limit(input.perPage).toArray();

      return Promise.all(
        contentPieces.map(async (contentPiece) => {
          const tags = await fetchContentPieceTags(ctx.db, contentPiece);
          const members = await fetchContentPieceMembers(ctx.db, contentPiece);

          return {
            ...contentPiece,
            ...(workspaceSettings?.metadata?.canonicalLinkPattern &&
              typeof contentPiece.canonicalLink !== "string" && {
                canonicalLink: workspaceSettings.metadata.canonicalLinkPattern.replace(
                  /{{slug}}/g,
                  contentPiece.slug
                )
              }),
            id: `${contentPiece._id}`,
            contentGroupId: `${contentPiece.contentGroupId}`,
            workspaceId: `${contentPiece.workspaceId}`,
            locked: contentGroup?.locked || false,
            date: contentPiece.date?.toISOString(),
            tags,
            members
          };
        })
      );
    }),
  create: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: basePath, protect: true },
      permissions: { session: ["manageDashboard"], token: ["contentPieces:write"] }
    })
    .input(
      contentPiece.omit({ id: true, slug: true }).extend({
        content: z.string().optional(),
        referenceId: zodId().optional(),
        slug: z.string().optional()
      })
    )
    .output(z.object({ id: zodId() }))
    .mutation(async ({ ctx, input }) => {
      const { referenceId, contentGroupId, customData, content, ...create } = input;

      const workspaceSettingsCollection = getWorkspaceSettingsCollection(ctx.db);
      const contentPiecesCollection = getContentPiecesCollection(ctx.db);
      const contentsCollection = getContentsCollection(ctx.db);
      const workspacesCollection = getWorkspacesCollection(ctx.db);
      const workspaceSettings = await workspaceSettingsCollection.findOne({
        workspaceId: ctx.auth.workspaceId
      });
      const workspace = await workspacesCollection.findOne({ _id: ctx.auth.workspaceId });
      const contentGroup = workspace?.contentGroups.find((contentGroup) => {
        return contentGroup._id.equals(contentGroupId);
      });
      const contentPiece: UnderscoreID<FullContentPiece<ObjectId>> = {
        ...create,
        _id: new ObjectId(),
        workspaceId: ctx.auth.workspaceId,
        contentGroupId: new ObjectId(contentGroupId),
        date: create.date ? new Date(create.date) : undefined,
        tags: create.tags?.map((tag) => new ObjectId(tag)) || [],
        members: create.members?.map((member) => new ObjectId(member)) || [],
        order: LexoRank.min().toString(),
        slug: create.slug || convertToSlug(create.title)
      };

      if (!workspace) throw errors.notFound("workspace");
      if (!contentGroup) throw errors.notFound("contentGroup");

      let referenceContentPiece: UnderscoreID<FullContentPiece<ObjectId>> | null = null;

      if (referenceId) {
        referenceContentPiece = await contentPiecesCollection.findOne({
          _id: new ObjectId(referenceId)
        });

        if (!referenceContentPiece) {
          throw errors.notFound("contentPiece", { contentPiece: "reference" });
        }
      }

      if (referenceContentPiece) {
        contentPiece.order = LexoRank.parse(referenceContentPiece.order).genNext().toString();
      } else {
        const [lastContentPiece] = await contentPiecesCollection
          .find({ contentGroupId: contentPiece.contentGroupId })
          .sort({ $natural: 1 })
          .limit(1)
          .toArray();

        if (lastContentPiece) {
          contentPiece.order = LexoRank.parse(lastContentPiece.order).genNext().toString();
        } else {
          contentPiece.order = LexoRank.min().toString();
        }
      }

      await contentPiecesCollection.insertOne(contentPiece);
      await contentsCollection.insertOne({
        _id: new ObjectId(),
        contentGroupId: contentPiece.contentGroupId,
        workspaceId: contentPiece.workspaceId,
        contentPieceId: contentPiece._id,
        ...(content && { content: new Binary(jsonToBuffer(htmlToJSON(content))) })
      });
      runWebhooks(ctx, "contentGroupAdded", webhookPayload(contentPiece));

      const tags = await fetchContentPieceTags(ctx.db, contentPiece);
      const members = await fetchContentPieceMembers(ctx.db, contentPiece);

      publishEvent(ctx, `${contentPiece.contentGroupId}`, {
        action: "create",
        userId: `${ctx.auth.userId}`,
        data: {
          ...contentPiece,
          ...(workspaceSettings?.metadata?.canonicalLinkPattern &&
            typeof contentPiece.canonicalLink !== "string" && {
              canonicalLink: workspaceSettings.metadata.canonicalLinkPattern.replace(
                /{{slug}}/g,
                contentPiece.slug
              )
            }),
          id: `${contentPiece._id}`,
          workspaceId: `${contentPiece.workspaceId}`,
          date: contentPiece.date?.toISOString(),
          contentGroupId: `${contentPiece.contentGroupId}`,
          tags,
          members
        }
      });

      return { id: `${contentPiece._id}` };
    }),
  update: authenticatedProcedure
    .meta({
      openapi: { method: "PUT", path: basePath, protect: true },
      permissions: { session: ["editMetadata", "manageDashboard"], token: ["contentPieces:write"] }
    })
    .input(
      contentPiece
        .extend({
          coverWidth: z.string(),
          content: z.string()
        })
        .partial()
        .required({ id: true })
    )
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const {
        id,
        content: updatedContent,
        contentGroupId: updatedContentGroupId,
        customData: updatedCustomData,
        tags: updatedTags,
        members: updatedMembers,
        date: updatedDate,
        ...update
      } = input;
      const extensionId = ctx.req.headers["x-vrite-extension-id"] as string | undefined;
      const contentPiecesCollection = getContentPiecesCollection(ctx.db);
      const contentsCollection = getContentsCollection(ctx.db);
      const workspacesCollection = getWorkspacesCollection(ctx.db);
      const workspaceSettingsCollection = getWorkspaceSettingsCollection(ctx.db);
      const workspaceSettings = await workspaceSettingsCollection.findOne({
        workspaceId: ctx.auth.workspaceId
      });
      const workspace = await workspacesCollection.findOne({ _id: ctx.auth.workspaceId });
      const contentPiece = await contentPiecesCollection.findOne({
        _id: new ObjectId(id)
      });

      if (!contentPiece) throw errors.notFound("contentPiece");

      const contentGroup = await workspace?.contentGroups.find((contentGroup) => {
        return contentGroup._id.equals(contentPiece.contentGroupId);
      });

      if (!contentGroup) throw errors.notFound("contentGroup");

      if (
        contentGroup.locked &&
        (Object.keys(input).length > 1 || !input.contentGroupId) &&
        !extensionId
      ) {
        throw errors.locked("contentGroup");
      }

      const contentPieceUpdates: Partial<UnderscoreID<FullContentPiece<ObjectId>>> = {
        ...update
      };

      if (typeof update.slug !== "undefined") {
        contentPieceUpdates.slug = convertToSlug(update.slug || update.title || contentPiece.title);
      } else if (convertToSlug(contentPiece.title) === contentPiece.slug) {
        contentPieceUpdates.slug = convertToSlug(update.title || contentPiece.title);
      }

      if (updatedTags) contentPieceUpdates.tags = updatedTags.map((tag) => new ObjectId(tag));
      if (updatedMembers) {
        contentPieceUpdates.members = updatedMembers.map((member) => new ObjectId(member));
      }
      if (updatedDate) contentPieceUpdates.date = new Date(updatedDate);
      if (updatedDate === null) contentPieceUpdates.date = null;

      if (updatedContentGroupId) {
        const newContentGroup = workspace?.contentGroups.find((contentGroup) => {
          return contentGroup._id.equals(updatedContentGroupId);
        });

        if (!newContentGroup) throw errors.notFound("contentGroup");

        contentPieceUpdates.contentGroupId = new ObjectId(updatedContentGroupId);
      }

      if (updatedCustomData) {
        const { $schema, ...customData } = updatedCustomData;

        contentPieceUpdates.customData = customData;
      }

      const newContentPiece = { ...contentPiece, ...contentPieceUpdates };

      await contentPiecesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: contentPieceUpdates }
      );

      if (updatedContent) {
        await contentsCollection.updateOne(
          {
            contentPieceId: contentPiece._id
          },
          {
            $set: {
              content: new Binary(jsonToBuffer(htmlToJSON(updatedContent)))
            }
          }
        );
      }

      if (!updatedContentGroupId || contentPiece.contentGroupId.equals(updatedContentGroupId)) {
        runWebhooks(ctx, "contentPieceUpdated", webhookPayload(newContentPiece));
      } else {
        runWebhooks(ctx, "contentPieceRemoved", webhookPayload(contentPiece));
        runWebhooks(ctx, "contentPieceAdded", webhookPayload(newContentPiece));
        await contentsCollection.updateOne(
          { contentPieceId: contentPiece._id },
          { $set: { contentGroupId: newContentPiece.contentGroupId } }
        );
      }

      const tags = await fetchContentPieceTags(ctx.db, newContentPiece);
      const members = await fetchContentPieceMembers(ctx.db, newContentPiece);

      publishEvent(ctx, `${newContentPiece.contentGroupId}`, {
        action: "update",
        userId: `${ctx.auth.userId}`,
        data: {
          ...newContentPiece,
          ...(workspaceSettings?.metadata?.canonicalLinkPattern &&
            typeof newContentPiece.canonicalLink !== "string" && {
              canonicalLink: workspaceSettings.metadata.canonicalLinkPattern.replace(
                /{{slug}}/g,
                newContentPiece.slug
              )
            }),
          id: `${newContentPiece._id}`,
          contentGroupId: `${newContentPiece.contentGroupId}`,
          workspaceId: `${newContentPiece.workspaceId}`,
          date: newContentPiece.date?.toISOString() || null,
          tags,
          members
        }
      });
    }),
  delete: authenticatedProcedure
    .meta({
      openapi: { method: "DELETE", path: basePath, protect: true },
      permissions: { session: ["manageDashboard"], token: ["contentPieces:read"] }
    })
    .input(z.object({ id: zodId() }))
    .output(z.object({ id: zodId().or(z.null()) }))
    .mutation(async ({ ctx, input }) => {
      const contentPiecesCollection = getContentPiecesCollection(ctx.db);
      const contentsCollection = getContentsCollection(ctx.db);
      const contentPiece = await contentPiecesCollection.findOne({
        _id: new ObjectId(input.id)
      });

      if (!contentPiece) throw errors.notFound("contentPiece");

      await contentPiecesCollection.deleteOne({ _id: contentPiece._id });
      await contentsCollection.deleteOne({ _id: contentPiece._id });
      publishEvent(ctx, `${contentPiece.contentGroupId}`, {
        action: "delete",
        userId: `${ctx.auth.userId}`,
        data: { id: input.id }
      });
      runWebhooks(ctx, "contentPieceRemoved", webhookPayload(contentPiece));

      return { id: input.id };
    }),
  move: authenticatedProcedure
    .meta({
      permissions: { session: ["manageDashboard"] }
    })
    .input(
      z.object({
        id: zodId(),
        contentGroupId: zodId().optional(),
        nextReferenceId: zodId().optional(),
        previousReferenceId: zodId().optional()
      })
    )
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const contentPiecesCollection = getContentPiecesCollection(ctx.db);
      const contentsCollection = getContentsCollection(ctx.db);
      const workspacesCollection = getWorkspacesCollection(ctx.db);
      const workspaceSettingsCollection = getWorkspaceSettingsCollection(ctx.db);
      const workspaceSettings = await workspaceSettingsCollection.findOne({
        workspaceId: ctx.auth.workspaceId
      });
      const contentPiece = await contentPiecesCollection.findOne({
        _id: new ObjectId(input.id)
      });

      const workspace = await workspacesCollection.findOne({ _id: ctx.auth.workspaceId });
      const contentGroup = workspace?.contentGroups.find((contentGroup) => {
        const contentGroupId = input.contentGroupId || contentPiece?.contentGroupId;

        if (!contentGroupId) return false;

        return contentGroup._id.equals(contentGroupId);
      });

      if (!contentGroup) throw errors.notFound("contentGroup");
      if (!contentPiece) throw errors.notFound("contentPiece");

      let nextReferenceContentPiece: UnderscoreID<FullContentPiece<ObjectId>> | null = null;
      let previousReferenceContentPiece: UnderscoreID<FullContentPiece<ObjectId>> | null = null;

      if (input.nextReferenceId) {
        nextReferenceContentPiece = await contentPiecesCollection.findOne({
          _id: new ObjectId(input.nextReferenceId)
        });
      }

      if (input.previousReferenceId) {
        previousReferenceContentPiece = await contentPiecesCollection.findOne({
          _id: new ObjectId(input.previousReferenceId)
        });
      }

      let newOrder = "";

      if (!previousReferenceContentPiece && nextReferenceContentPiece) {
        newOrder = LexoRank.parse(nextReferenceContentPiece.order).genPrev().toString();
      } else if (!nextReferenceContentPiece && previousReferenceContentPiece) {
        newOrder = LexoRank.parse(previousReferenceContentPiece.order).genNext().toString();
      } else if (previousReferenceContentPiece && nextReferenceContentPiece) {
        newOrder = LexoRank.parse(nextReferenceContentPiece.order)
          .between(LexoRank.parse(previousReferenceContentPiece.order))
          .toString();
      } else if (contentPiece) {
        newOrder = LexoRank.parse(contentPiece.order).genNext().toString();
      }

      const update: Partial<UnderscoreID<FullContentPiece<ObjectId>>> = { order: newOrder };

      if (input.contentGroupId) {
        update.contentGroupId = new ObjectId(input.contentGroupId);
      }

      await contentPiecesCollection.updateOne(
        { _id: new ObjectId(input.id) },
        {
          $set: update
        }
      );

      const tags = await fetchContentPieceTags(ctx.db, contentPiece);
      const members = await fetchContentPieceMembers(ctx.db, contentPiece);

      publishEvent(
        ctx,
        [
          `${contentPiece.contentGroupId}`,
          ...(update.contentGroupId ? [`${update.contentGroupId}`] : [])
        ],
        {
          action: "move",
          userId: `${ctx.auth.userId}`,
          data: {
            contentPiece: {
              ...contentPiece,
              ...(workspaceSettings?.metadata?.canonicalLinkPattern &&
                typeof contentPiece.canonicalLink !== "string" && {
                  canonicalLink: workspaceSettings.metadata.canonicalLinkPattern.replace(
                    /{{slug}}/g,
                    contentPiece.slug
                  )
                }),
              id: `${contentPiece._id}`,
              contentGroupId: `${update.contentGroupId || contentPiece.contentGroupId}`,
              locked: contentGroup?.locked || false,
              workspaceId: `${contentPiece.workspaceId}`,
              date: contentPiece.date?.toISOString(),
              tags,
              members
            },
            nextReferenceId: input.nextReferenceId,
            previousReferenceId: input.previousReferenceId
          }
        }
      );

      if (
        input.contentGroupId &&
        contentPiece &&
        !contentPiece.contentGroupId.equals(input.contentGroupId)
      ) {
        runWebhooks(ctx, "contentGroupRemoved", webhookPayload(contentPiece));
        runWebhooks(
          ctx,
          "contentPieceAdded",
          webhookPayload({ ...contentPiece, contentGroupId: new ObjectId(input.contentGroupId) })
        );
        await contentsCollection.updateOne(
          { contentPieceId: contentPiece._id },
          { $set: { contentGroupId: new ObjectId(input.contentGroupId) } }
        );
      }
    }),
  changes: authenticatedProcedure
    .input(z.object({ contentGroupId: zodId() }))
    .subscription(async ({ ctx, input }) => {
      return createEventSubscription<ContentPieceEvent>(
        ctx,
        `contentPieces:${input.contentGroupId}`
      );
    })
});

export { contentPiecesRouter, fetchContentPieceTags };
export type { ContentPieceEvent };
