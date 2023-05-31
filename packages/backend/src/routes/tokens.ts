import { z } from "zod";
import { ObjectId } from "mongodb";
import { nanoid } from "nanoid";
import { procedure, router } from "#lib/trpc";
import { AuthenticatedContext, isAuthenticated } from "#lib/middleware";
import { generateSalt, hashValue } from "#lib/hash";
import { UnderscoreID, zodId } from "#lib/mongo";
import { Token, FullToken, getTokensCollection, token } from "#database/tokens";
import * as errors from "#lib/errors";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";

type TokenEvent =
  | {
      action: "create";
      data: Token;
    }
  | { action: "update"; data: Partial<Token> & { id: string } }
  | { action: "delete"; data: { id: string } };

const publishEvent = createEventPublisher<TokenEvent>((workspaceId) => `tokens:${workspaceId}`);
const authenticatedProcedure = procedure.use(isAuthenticated);
const createToken = async (
  input: Omit<Token, "id">,
  ctx: AuthenticatedContext,
  extensionId?: ObjectId
): Promise<{ token: UnderscoreID<Token<ObjectId>>; value: string }> => {
  const tokensCollection = getTokensCollection(ctx.db);
  const username = nanoid();
  const password = nanoid();
  const salt = await generateSalt();
  const token: UnderscoreID<FullToken<ObjectId>> = {
    ...input,
    _id: new ObjectId(),
    workspaceId: ctx.auth.workspaceId,
    userId: ctx.auth.userId,
    salt,
    password: await hashValue(password, salt),
    username,
    extensionId
  };

  await tokensCollection.insertOne(token);

  return { token, value: `${username}:${password}` };
};
const tokensRouter = router({
  get: authenticatedProcedure
    .input(z.object({ id: z.string() }))
    .output(token)
    .query(async ({ ctx, input }) => {
      const tokensCollection = getTokensCollection(ctx.db);
      const token = await tokensCollection.findOne({
        _id: new ObjectId(input.id),
        workspaceId: ctx.auth.workspaceId
      });

      if (!token) throw errors.notFound("token");

      return {
        id: `${token._id}`,
        name: token.name || "",
        description: token.description || "",
        permissions: token.permissions
      };
    }),
  delete: authenticatedProcedure
    .meta({
      permissions: { session: ["manageTokens"] }
    })
    .input(z.object({ id: z.string() }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const tokensCollection = getTokensCollection(ctx.db);
      const { deletedCount } = await tokensCollection.deleteOne({ _id: new ObjectId(input.id) });

      if (deletedCount === 0) throw errors.notFound("token");

      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "delete",
        data: {
          id: input.id
        }
      });
    }),
  list: authenticatedProcedure
    .input(
      z
        .object({
          perPage: z.number().default(20),
          page: z.number().default(1),
          lastId: zodId().optional()
        })
        .default({})
    )
    .output(z.array(token.extend({ extension: z.boolean().optional() })))
    .query(async ({ ctx, input }) => {
      const tokensCollection = getTokensCollection(ctx.db);
      const cursor = tokensCollection
        .find({
          workspaceId: ctx.auth.workspaceId,
          ...(input.lastId ? { _id: { $lt: new ObjectId(input.lastId) } } : {})
        })
        .sort("_id", -1);

      if (!input.lastId) {
        cursor.skip((input.page - 1) * input.perPage);
      }

      const tokens = await cursor.limit(input.perPage).toArray();

      return tokens.map((token) => ({
        id: `${token._id}`,
        name: token.name || "",
        description: token.description || "",
        permissions: token.permissions,
        ...(token.extensionId && { extension: true })
      }));
    }),
  create: authenticatedProcedure
    .meta({
      permissions: { session: ["manageTokens"] }
    })
    .input(token.omit({ id: true }))
    .output(z.object({ value: z.string(), id: zodId() }))
    .mutation(async ({ ctx, input }) => {
      const { token, value } = await createToken(input, ctx);

      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "create",
        data: {
          id: `${token._id}`,
          name: token.name || "",
          description: token.description || "",
          permissions: token.permissions
        }
      });

      return {
        value,
        id: `${token._id}`
      };
    }),
  update: authenticatedProcedure
    .meta({
      permissions: { session: ["manageTokens"] }
    })
    .input(token.partial().required({ id: true }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const tokensCollection = getTokensCollection(ctx.db);
      const { id, ...update } = input;
      const { matchedCount } = await tokensCollection.updateOne(
        {
          _id: new ObjectId(id),
          workspaceId: ctx.auth.workspaceId
        },
        {
          $set: update
        }
      );

      if (matchedCount === 0) throw errors.notFound("token");

      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "update",
        data: {
          id,
          ...update
        }
      });
    }),
  changes: authenticatedProcedure.input(z.void()).subscription(({ ctx }) => {
    return createEventSubscription<TokenEvent>(ctx, `tokens:${ctx.auth.workspaceId}`);
  }),
  regenerate: authenticatedProcedure
    .meta({
      permissions: { session: ["manageTokens"] }
    })
    .input(z.object({ id: z.string() }))
    .output(z.object({ value: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tokensCollection = getTokensCollection(ctx.db);
      const token = await tokensCollection.findOne({
        _id: new ObjectId(input.id),
        workspaceId: ctx.auth.workspaceId
      });

      if (!token) throw errors.notFound("token");

      const username = nanoid();
      const password = nanoid();

      await tokensCollection.updateOne(
        {
          _id: new ObjectId(input.id)
        },
        {
          $set: {
            userId: ctx.auth.userId,
            username,
            password: await hashValue(password, token.salt)
          }
        }
      );

      return {
        value: `${username}:${password}`,
        id: `${token._id}`
      };
    })
});

export { tokensRouter, createToken };
