import {
  publicPlugin,
  getContentsCollection,
  getContentVariantsCollection,
  getGitDataCollection,
  docToJSON,
  getContentPiecesCollection,
  GitData
} from "@vrite/backend";
import { Server } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { Redis } from "@hocuspocus/extension-redis";
import { ObjectId, Binary } from "mongodb";
import { SessionData } from "@vrite/backend/src/lib/session";
import { unauthorized } from "@vrite/backend/src/lib/errors";
import { createEventPublisher } from "@vrite/backend/src/lib/pub-sub";
import { gfmOutputTransformer } from "@vrite/sdk/transformers";
import crypto from "node:crypto";

type GitDataEvent = {
  action: "update";
  data: Partial<GitData>;
};

const publishGitDataEvent = createEventPublisher<GitDataEvent>((workspaceId) => {
  return `gitData:${workspaceId}`;
});
const writingPlugin = publicPlugin(async (fastify) => {
  const contentsCollection = getContentsCollection(fastify.mongo.db!);
  const contentPiecesCollection = getContentPiecesCollection(fastify.mongo.db!);
  const contentVariantsCollection = getContentVariantsCollection(fastify.mongo.db!);
  const gitDataCollection = getGitDataCollection(fastify.mongo.db!);
  const server = Server.configure({
    port: fastify.config.PORT,
    address: fastify.config.HOST,
    async onAuthenticate(data) {
      const cookies = fastify.parseCookie(data.requestHeaders.cookie || "");

      if (!cookies.accessToken) {
        throw unauthorized();
      }

      const token = fastify.unsignCookie(cookies.accessToken || "")?.value || "";

      if (!token) {
        throw unauthorized();
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
            if (variantId) {
              if (!(details as { update?: any }).update) {
                return;
              }

              return contentVariantsCollection?.updateOne(
                {
                  contentPieceId: new ObjectId(contentPieceId),
                  variantId: new ObjectId(variantId)
                },
                { $set: { content: new Binary(state) } },
                { upsert: true }
              );
            }

            const contentPiece = await contentPiecesCollection.findOne({
              _id: new ObjectId(contentPieceId)
            });
            const gitData = await gitDataCollection.findOne({
              workspaceId: new ObjectId(details.context.workspaceId)
            });
            const json = docToJSON(details.document);
            const md = gfmOutputTransformer(json, contentPiece);
            const currentHash = crypto.createHash("md5").update(md).digest("hex");

            await gitDataCollection.updateOne(
              {
                "workspaceId": new ObjectId(details.context.workspaceId),
                "records.contentPieceId": new ObjectId(contentPieceId)
              },
              {
                $set: {
                  "records.$.currentHash": currentHash
                }
              }
            );
            publishGitDataEvent({ fastify }, `${details.context.workspaceId}`, {
              action: "update",
              data: {
                records: gitData.records.map((record) => {
                  if (record.contentPieceId.toString() === contentPieceId) {
                    return {
                      ...record,
                      currentHash
                    };
                  }

                  return record;
                })
              }
            });

            return contentsCollection?.updateOne(
              { contentPieceId: new ObjectId(contentPieceId) },
              { $set: { content: new Binary(state) } },
              { upsert: true }
            );
          }
        }
      })
    ]
  });

  server.listen();
});

export { writingPlugin };
