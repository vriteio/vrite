import cors from "@elysiajs/cors";
import { Elysia } from "elysia";
import { Server } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { routerPlugin } from "#backend/router";
import { sessionPlugin } from "./plugins";
import "./events";
import { contentsDB } from "#backend/db";
import { toObjectID } from "./lib/mongo";
import { Binary } from "mongodb";

const server = new Elysia()
  .use(
    cors({
      origin: /.*localhost.*/
    })
  )
  .use(sessionPlugin)
  .use(routerPlugin);
const collabServer = Server.configure({
  port: 1234,
  extensions: [
    new Database({
      async fetch({ documentName }) {
        if (documentName === "explorer") return null;
        const entryID = documentName;
        const content = await contentsDB.findOne({
          entryID: toObjectID(entryID)
        });

        if (content && content.content) {
          return new Uint8Array(content.content.buffer);
        }

        return null;
      },
      async store({ documentName, state }) {
        await contentsDB?.updateOne(
          { entryID: toObjectID(documentName) },
          { $set: { content: new Binary(state) } },
          { upsert: true }
        );
      }
    })
  ]
});

server.listen(process.env.PORT || 3333);
collabServer.listen();
console.log(`Server is running`);

export type App = typeof server;
export type * from "#backend/db";
export type * from "#backend/events";
