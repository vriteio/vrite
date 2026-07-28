import { contentsDB, entriesDB, toEntryID, toWorkspaceID } from "#backend/db";
import { emitEntryEvent } from "#backend/events";
import { toUUID } from "#backend/lib/mongo";
import { Database } from "@hocuspocus/extension-database";
import { Hocuspocus } from "@hocuspocus/server";
import { Binary } from "mongodb";
import { XmlElement, XmlText } from "yjs";
import type { Doc } from "yjs";

const getDocumentTitle = (document: Doc): string => {
  const titleElement = document
    .getXmlFragment("default")
    .toArray()
    .find((node): node is XmlElement => {
      return node instanceof XmlElement && node.nodeName === "title";
    });
  const title =
    titleElement
      ?.toArray()
      .filter((node): node is XmlText => node instanceof XmlText)
      .map((node) => node.toString())
      .join("")
      .trim() || "";

  return title || "Untitled";
};

const collab = new Hocuspocus({
  extensions: [
    new Database({
      async fetch({ documentName }) {
        if (documentName === "explorer") return null;

        const content = await contentsDB.findOne({
          entryID: toUUID(documentName)
        });

        if (content?.content) {
          return new Uint8Array(content.content.buffer);
        }

        return null;
      },
      async store({ document, documentName, state }) {
        const entryID = toUUID(documentName);
        const title = getDocumentTitle(document);
        const [, previousEntry] = await Promise.all([
          contentsDB.updateOne(
            { entryID },
            { $set: { content: new Binary(state) } },
            { upsert: true }
          ),
          entriesDB.findOneAndUpdate(
            { _id: entryID, name: { $ne: title } },
            { $set: { name: title } },
            { returnDocument: "before" }
          )
        ]);

        if (previousEntry) {
          await emitEntryEvent(toWorkspaceID(previousEntry.workspaceID), {
            action: "entry:update",
            data: {
              id: toEntryID(previousEntry._id),
              name: title
            }
          });
        }
      }
    })
  ]
});

const updateDocumentTitle = async (documentName: string, title: string): Promise<void> => {
  const connection = await collab.openDirectConnection(documentName);

  try {
    await connection.transact((document) => {
      const fragment = document.getXmlFragment("default");

      let titleElement = fragment.toArray().find((node): node is XmlElement => {
        return node instanceof XmlElement && node.nodeName === "title";
      });

      if (!titleElement) {
        titleElement = new XmlElement("title");
        fragment.insert(0, [titleElement]);
      }

      const hasContentBlock = fragment
        .toArray()
        .some((node) => node instanceof XmlElement && node.nodeName !== "title");

      if (!hasContentBlock) {
        fragment.push([new XmlElement("paragraph")]);
      }

      const currentTitle = titleElement
        .toArray()
        .filter((node): node is XmlText => node instanceof XmlText)
        .map((node) => node.toString())
        .join("");

      if (currentTitle === title) return;

      if (titleElement.length > 0) {
        titleElement.delete(0, titleElement.length);
      }

      if (title) {
        titleElement.insert(0, [new XmlText(title)]);
      }
    });
  } finally {
    await connection.disconnect();
  }
};

export { collab, updateDocumentTitle };
