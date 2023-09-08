import {
  publicPlugin,
  getContentsCollection,
  getContentVariantsCollection,
  getGitDataCollection,
  docToJSON,
  getContentPiecesCollection,
  GitData,
  createGenericOutputContentProcessor,
  jsonToBuffer
} from "@vrite/backend";
import { Server, storePayload } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { Redis } from "@hocuspocus/extension-redis";
import { ObjectId, Binary } from "mongodb";
import { SessionData } from "@vrite/backend/src/lib/session";
import { unauthorized } from "@vrite/backend/src/lib/errors";
import { createEventPublisher } from "@vrite/backend/src/lib/pub-sub";
import crypto from "node:crypto";

type GitDataEvent = {
  action: "update";
  data: Partial<GitData>;
};

const publishGitDataEvent = createEventPublisher<GitDataEvent>((workspaceId) => {
  return `gitData:${workspaceId}`;
});
const writingPlugin = publicPlugin(async (fastify) => {
  const gitDataCollection = getGitDataCollection(fastify.mongo.db!);
  const contentsCollection = getContentsCollection(fastify.mongo.db!);
  const contentPiecesCollection = getContentPiecesCollection(fastify.mongo.db!);
  const contentVariantsCollection = getContentVariantsCollection(fastify.mongo.db!);
  const updateGitRecord = async (
    contentPieceId: string,
    details: Pick<storePayload, "context" | "document">
  ): Promise<void> => {
    const gitData = await gitDataCollection.findOne({
      workspaceId: new ObjectId(details.context.workspaceId)
    });

    if (!gitData) return;

    const contentPiece = await contentPiecesCollection.findOne({
      _id: new ObjectId(contentPieceId)
    });
    const json = docToJSON(details.document);
    const outputContentProcessor = await createGenericOutputContentProcessor(
      {
        db: fastify.mongo.db!,
        auth: {
          workspaceId: new ObjectId(details.context.workspaceId),
          userId: new ObjectId(details.context.userId)
        }
      },
      gitData
    );
    const output = await outputContentProcessor.process({
      buffer: jsonToBuffer(json),
      contentPiece
    });
    const currentHash = crypto.createHash("md5").update(output).digest("hex");

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
  };
  const upsertSearchContent = async (
    contentPieceId: string,
    details: {
      contentBuffer: Buffer;
      workspaceId: string;
      variantId?: string;
    }
  ): Promise<void> => {
    if (!fastify.hostConfig.search) return;

    const contentPiece = await contentPiecesCollection.findOne({
      _id: new ObjectId(contentPieceId),
      workspaceId: new ObjectId(details.workspaceId)
    });

    await fastify.search.upsertContent({
      contentPiece,
      content: details.contentBuffer,
      variantId: details.variantId
    });
  };
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
            if (!(details as { update?: any }).update) {
              return;
            }

            upsertSearchContent(contentPieceId, {
              workspaceId: details.context.workspaceId,
              contentBuffer: state,
              variantId
            });

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

            updateGitRecord(contentPieceId, details);

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
