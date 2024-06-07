import {
  createPlugin,
  getContentsCollection,
  getContentVariantsCollection,
  errors,
  SessionData,
  getSnippetContentsCollection
} from "@vrite/backend";
import { Server } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { Redis } from "@hocuspocus/extension-redis";
import { ObjectId, Binary } from "mongodb";
import { SearchIndexing } from "#extensions/search-indexing";
import { GitSync } from "#extensions/git-sync";

const writingPlugin = createPlugin(async (fastify) => {
  const snippetContentsCollection = getSnippetContentsCollection(fastify.mongo.db!);
  const contentsCollection = getContentsCollection(fastify.mongo.db!);
  const contentVariantsCollection = getContentVariantsCollection(fastify.mongo.db!);
  const server = Server.configure({
    port: fastify.config.PORT,
    address: fastify.config.HOST,
    async onAuthenticate(data) {
      const cookies = fastify.parseCookie(data.requestHeaders.cookie || "");

      if (!cookies.accessToken) {
        throw errors.unauthorized();
      }

      const token = fastify.unsignCookie(cookies.accessToken || "")?.value || "";

      if (!token) {
        throw errors.unauthorized();
      }

      const { sessionId } = fastify.jwt.verify<{ sessionId: string }>(token);
      const sessionCache = await fastify.redis.get(`session:${sessionId}`);
      const sessionData = JSON.parse(sessionCache || "{}") as SessionData;

      if (sessionData.baseType !== "admin" && !sessionData.permissions.includes("editContent")) {
        data.connection.readOnly = true;
      }

      if (fastify.hostConfig.billing && !sessionData.subscriptionPlan) {
        data.connection.readOnly = true;
      }

      return sessionData;
    },
    extensions: [
      new Redis({ redis: fastify.redis }),
      new Database({
        async fetch({ documentName }) {
          if (documentName.startsWith("workspace:")) {
            return null;
          }

          if (documentName.startsWith("snippet:")) {
            const snippetContent = await snippetContentsCollection.findOne({
              snippetId: new ObjectId(documentName.split(":")[1])
            });

            if (snippetContent && snippetContent.content) {
              return new Uint8Array(snippetContent.content.buffer);
            }

            return null;
          }

          const [contentPieceId, variantId] = documentName.split(":");

          if (variantId) {
            const contentVariant = await contentVariantsCollection.findOne({
              contentPieceId: new ObjectId(contentPieceId),
              variantId: new ObjectId(variantId)
            });

            if (contentVariant && contentVariant.content) {
              return new Uint8Array(contentVariant.content.buffer);
            }
          }

          const content = await contentsCollection.findOne({
            contentPieceId: new ObjectId(contentPieceId)
          });

          if (content && content.content) {
            return new Uint8Array(content.content.buffer);
          }

          return null;
        },
        async store({ documentName, state, ...details }) {
          if (documentName.startsWith("workspace:")) {
            return;
          }

          if (documentName.startsWith("snippet:")) {
            const snippetId = documentName.split(":")[1] || "";

            if (state) {
              await snippetContentsCollection?.updateOne(
                {
                  snippetId: new ObjectId(snippetId)
                },
                { $set: { content: new Binary(state) } },
                { upsert: true }
              );

              return;
            }
          }

          const [contentPieceId, variantId] = documentName.split(":");

          if (state) {
            if (!(details as { update?: any }).update) {
              return;
            }

            if (variantId) {
              await contentVariantsCollection?.updateOne(
                {
                  contentPieceId: new ObjectId(contentPieceId),
                  variantId: new ObjectId(variantId)
                },
                { $set: { content: new Binary(state) } },
                { upsert: true }
              );

              return;
            }

            await contentsCollection?.updateOne(
              { contentPieceId: new ObjectId(contentPieceId) },
              { $set: { content: new Binary(state) } },
              { upsert: true }
            );
          }
        }
      }),
      new SearchIndexing(fastify),
      new GitSync(fastify)
    ]
  });

  server.listen();
});

export { writingPlugin };
