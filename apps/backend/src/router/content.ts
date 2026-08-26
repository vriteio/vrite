import { contentNodeType } from "#backend/lib/content";
import { versionSummaryType } from "#backend/lib/data";
import { PUBLISHED_CHANNEL_CODE, publishingChannelCodeType } from "#backend/lib/publishing";
import { id } from "#backend/lib/primitives";
import {
  authorized,
  base,
  getCacheHeaders,
  hashEntityTag,
  matchesEntityTag
} from "#backend/lib/transport";
import { Publishing } from "#backend/services/publishing";
import * as z from "zod";

interface PublishedTreeEntryOutput {
  id: string;
  name: string;
  version: {
    id: string;
    hash: string;
  };
}
interface PublishedTreeCollectionOutput {
  id: string;
  name: string;
  entries: PublishedTreeEntryOutput[];
  collections: PublishedTreeCollectionOutput[];
}

const publishedContentType = z.object({
  channel: publishingChannelCodeType.describe("Publishing channel used for delivery"),
  name: z.string().describe("Entry name stored in the published version"),
  version: versionSummaryType,
  content: contentNodeType,
  fragments: z.record(
    z.string(),
    z.object({
      name: z.string().describe("Source fragment name"),
      content: contentNodeType
    })
  ),
  properties: z.record(
    z.string(),
    z.object({
      name: z.string().describe("Source property name"),
      type: z.enum(["text", "number", "checkbox", "date", "url", "select", "multi-select"]),
      value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()])
    })
  )
});
const publishedTreeEntryType = z.object({
  id: id().describe("ID of the published entry"),
  name: z.string().describe("Entry name stored in the published version"),
  version: z.object({
    id: id().describe("ID of the assigned version"),
    hash: z.string().length(64).describe("Hash of the assigned version content")
  })
});
const publishedTreeCollectionType: z.ZodType<PublishedTreeCollectionOutput> = z.lazy(() => {
  return z.object({
    id: id().describe("ID of the collection"),
    name: z.string().describe("Name of the collection"),
    entries: z.array(publishedTreeEntryType),
    collections: z.array(publishedTreeCollectionType)
  });
});
const cacheHeadersType = z.object({
  "Cache-Control": z.string(),
  "ETag": z.string()
});
const cachedPublishedContentType = z.union([
  z.object({
    status: z.literal(200),
    headers: cacheHeadersType,
    body: publishedContentType
  }),
  z.object({
    status: z.literal(304).describe("Not Modified"),
    headers: cacheHeadersType
  })
]);
const publishedTreeType = z.object({
  channel: publishingChannelCodeType,
  collection: publishedTreeCollectionType
});
const cachedPublishedTreeType = z.union([
  z.object({
    status: z.literal(200),
    headers: cacheHeadersType,
    body: publishedTreeType
  }),
  z.object({
    status: z.literal(304).describe("Not Modified"),
    headers: cacheHeadersType
  })
]);
const contentRouter = base.prefix("/content").router({
  get: base
    .route({
      method: "GET",
      path: "/entries/:entryID",
      outputStructure: "detailed"
    })
    .meta({
      required: {
        key: ["read:publishing"]
      }
    })
    .use(authorized)
    .input(
      z.object({
        entryID: id().describe("Entry whose published content to get"),
        channel: publishingChannelCodeType
          .optional()
          .default(PUBLISHED_CHANNEL_CODE)
          .describe("Publishing channel, defaults to published")
      })
    )
    .output(cachedPublishedContentType)
    .handler(async ({ context, input }) => {
      const content = await Publishing.Entries.getContent({
        workspaceID: context.auth.workspaceID,
        entryID: input.entryID,
        channel: input.channel
      });
      const entityTag = hashEntityTag(content);
      const headers = getCacheHeaders(entityTag);

      if (matchesEntityTag(context.reqHeaders?.get("If-None-Match"), entityTag)) {
        return { status: 304, headers } as const;
      }

      return { status: 200, headers, body: content } as const;
    }),
  getTree: base
    .route({
      method: "GET",
      path: "/tree/:collectionID",
      outputStructure: "detailed"
    })
    .meta({
      required: {
        key: ["read:publishing"]
      }
    })
    .use(authorized)
    .input(
      z.object({
        collectionID: id().describe("Publishing-enabled collection whose tree to get"),
        channel: publishingChannelCodeType
          .optional()
          .default(PUBLISHED_CHANNEL_CODE)
          .describe("Publishing channel, defaults to published")
      })
    )
    .output(cachedPublishedTreeType)
    .handler(async ({ context, input }) => {
      const content = await Publishing.Collections.getContentTree({
        workspaceID: context.auth.workspaceID,
        collectionID: input.collectionID,
        channel: input.channel
      });
      const entityTag = hashEntityTag(content);
      const headers = getCacheHeaders(entityTag);

      if (matchesEntityTag(context.reqHeaders?.get("If-None-Match"), entityTag)) {
        return { status: 304, headers } as const;
      }

      return { status: 200, headers, body: content } as const;
    })
});

export { contentRouter };
