import {
  publicPlugin,
  getContentsCollection,
  getContentVariantsCollection,
  errors,
  SessionData
} from "@vrite/backend";
import { Server } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { Redis } from "@hocuspocus/extension-redis";
import { ObjectId, Binary } from "mongodb";
import { SearchIndexing } from "#extensions/search-indexing";
import { GitSync } from "#extensions/git-sync";

const writingPlugin = publicPlugin(async (fastify) => {
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

      return sessionData;
    },
    extensions: [
      new Redis({ redis: fastify.redis }),
      new Database({
        async fetch({ documentName }) {
          if (documentName.startsWith("workspace:")) {
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
          const [contentPieceId, variantId] = documentName.split(":");

          if (documentName.startsWith("workspace:")) {
            return;
          }

          if (state) {
            if (!(details as { update?: any }).update) {
              return;
            }

            if (variantId) {
              return contentVariantsCollection?.updateOne(
                {
                  contentPieceId: new ObjectId(contentPieceId),
                  variantId: new ObjectId(variantId)
                },
                { $set: { content: new Binary(state) } },
                { upsert: true }
              );
            }

            return contentsCollection?.updateOne(
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
