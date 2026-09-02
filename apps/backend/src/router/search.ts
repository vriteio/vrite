import { publishingChannelCodeType } from "#backend/lib/publishing";
import { id } from "#backend/lib/primitives";
import { RATE_LIMITS, consumeRateLimit } from "#backend/lib/security";
import { authorized, base, sessionRoute } from "#backend/lib/transport";
import { Search } from "#backend/services/search";
import { ORPCError } from "@orpc/server";
import * as z from "zod";

const propertyKeyType = z.string().trim().min(1).max(100).describe("Property identifier");
const comparisonOperatorType = z.enum([
  "equals",
  "notEquals",
  "greaterThan",
  "greaterThanOrEqual",
  "lessThan",
  "lessThanOrEqual"
]);
const textPropertyFilterType = z.object({
  kind: z.literal("text"),
  key: propertyKeyType,
  operator: z.enum(["any", "all", "none"]).default("any"),
  values: z.array(z.string().max(500)).min(1).max(20)
});
const numberPropertyFilterType = z.object({
  kind: z.literal("number"),
  key: propertyKeyType,
  operator: comparisonOperatorType,
  value: z.number().finite()
});
const booleanPropertyFilterType = z.object({
  kind: z.literal("boolean"),
  key: propertyKeyType,
  value: z.boolean()
});
const datePropertyFilterType = z.object({
  kind: z.literal("date"),
  key: propertyKeyType,
  operator: comparisonOperatorType,
  value: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Invalid date"
  })
});
const propertyFilterType = z.discriminatedUnion("kind", [
  textPropertyFilterType,
  numberPropertyFilterType,
  booleanPropertyFilterType,
  datePropertyFilterType
]);
const propertyValueType = z.object({
  key: z.string(),
  name: z.string(),
  type: z.enum(["text", "number", "checkbox", "date", "url", "select", "multi-select"]),
  textValue: z.array(z.string()).optional(),
  numberValue: z.number().optional(),
  booleanValue: z.boolean().optional(),
  dateValue: z.number().int().optional()
});
const searchInputType = z.object({
  query: z.string().trim().max(500),
  collectionID: id().optional().describe("Optional collection tree to search"),
  filters: z.array(propertyFilterType).max(20).default([]),
  limit: z.number().int().min(1).max(50).default(20),
  semantic: z.boolean().default(false).describe("Whether to combine keyword and vector search")
});
const publishedSearchInputType = searchInputType.extend({
  channel: publishingChannelCodeType.describe("Publishing channel to search")
});
const historyMessageType = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000)
});
const askInputType = z.object({
  question: z.string().trim().min(1).max(1000),
  collectionID: id().optional().describe("Optional collection tree to search"),
  filters: z.array(propertyFilterType).max(20).default([]),
  history: z.array(historyMessageType).max(10).default([])
});
const publishedAskInputType = askInputType.extend({
  channel: publishingChannelCodeType.describe("Publishing channel to search")
});
const searchResultItemType = z.object({
  entryID: id(),
  collectionID: id().optional(),
  collectionPath: z.array(z.string()),
  headingPath: z.array(z.string()),
  title: z.string(),
  snippet: z.string(),
  properties: z.array(propertyValueType),
  updatedAt: z.iso.datetime(),
  channel: publishingChannelCodeType.optional(),
  versionID: id().optional()
});
const searchResultType = z.object({
  results: z.array(searchResultItemType)
});
const askResultType = z.object({
  answer: z.string(),
  sources: z.array(
    searchResultItemType.extend({
      id: z.number().int().min(1),
      relevance: z.number().min(0).max(1)
    })
  )
});
const currentSearchRoute = base
  .meta({ required: { session: true, key: ["read:entries", "read:collections"] } })
  .use(authorized);
const publishedSearchRoute = base
  .meta({ required: { session: true, key: ["read:publishing"] } })
  .use(authorized);
const askRoute = sessionRoute.meta({ trackUsage: true });
const enforceAskRateLimit = async (key: string, headers?: Headers): Promise<void> => {
  const limit = await consumeRateLimit({
    scope: "ask-ai",
    key,
    limit: RATE_LIMITS.askAI
  });

  if (limit.allowed) return;

  headers?.set("Retry-After", `${limit.retryAfter}`);
  throw new ORPCError("TOO_MANY_REQUESTS", {
    message: "Too many Ask AI requests. Try again later."
  });
};
const enforceSemanticSearchRateLimit = async (key: string, headers?: Headers): Promise<void> => {
  const limit = await consumeRateLimit({
    scope: "semantic-search",
    key,
    limit: RATE_LIMITS.semanticSearch
  });

  if (limit.allowed) return;

  headers?.set("Retry-After", `${limit.retryAfter}`);
  throw new ORPCError("TOO_MANY_REQUESTS", {
    message: "Too many semantic search requests. Try again later."
  });
};
const searchRouter = base.prefix("/search").router({
  current: currentSearchRoute
    .route({ method: "POST", path: "/current" })
    .input(searchInputType)
    .output(searchResultType)
    .handler(async ({ context, input }) => {
      if (input.semantic) {
        await enforceSemanticSearchRateLimit(context.auth.id, context.resHeaders);
      }

      return Search.current({ auth: context.auth, ...input });
    }),
  published: publishedSearchRoute
    .route({ method: "POST", path: "/published" })
    .input(publishedSearchInputType)
    .output(searchResultType)
    .handler(async ({ context, input }) => {
      if (input.semantic) {
        await enforceSemanticSearchRateLimit(context.auth.id, context.resHeaders);
      }

      return Search.published({ auth: context.auth, ...input });
    }),
  askCurrent: askRoute
    .route({ method: "POST", path: "/current/ask" })
    .input(askInputType)
    .output(askResultType)
    .handler(async ({ context, input }) => {
      await enforceAskRateLimit(context.auth.id, context.resHeaders);

      return Search.askCurrent({ auth: context.auth, ...input });
    }),
  askPublished: askRoute
    .route({ method: "POST", path: "/published/ask" })
    .input(publishedAskInputType)
    .output(askResultType)
    .handler(async ({ context, input }) => {
      await enforceAskRateLimit(context.auth.id, context.resHeaders);

      return Search.askPublished({ auth: context.auth, ...input });
    })
});

export { searchRouter };
