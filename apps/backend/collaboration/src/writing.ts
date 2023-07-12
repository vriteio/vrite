import { publicPlugin, getContentsCollection } from "@vrite/backend";
import { Server } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { ObjectId, Binary } from "mongodb";
import { SessionData } from "@vrite/backend/src/lib/session";
import { unauthorized } from "@vrite/backend/src/lib/errors";

const writingPlugin = publicPlugin(async (fastify) => {
  const contentsCollection = getContentsCollection(fastify.mongo.db!);
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
    },
    extensions: [
      new Database({
        async fetch({ documentName }) {
          if (documentName.startsWith("workspace:")) {
            return null;
          }

          const articleContent = await contentsCollection.findOne({
            contentPieceId: new ObjectId(documentName)
          });

          if (articleContent && articleContent.content) {
            return new Uint8Array(articleContent.content.buffer);
          }

          return null;
        },
        store({ documentName, state }) {
          if (documentName.startsWith("workspace:")) {
            return;
          }

          if (state) {
            return contentsCollection?.updateOne(
              { contentPieceId: new ObjectId(documentName) },
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
