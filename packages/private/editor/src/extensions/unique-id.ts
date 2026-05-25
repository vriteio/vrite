import { UniqueID as BaseUniqueID } from "@tiptap/extension-unique-id";
import { nanoid } from "nanoid";

const UniqueID = BaseUniqueID.configure({
  attributeName: "id",
  types: [
    "paragraph",
    "bulletList",
    "orderedList",
    "taskList",
    "blockquote",
    "horizontalRule",
    "heading",
    "listItem",
    "taskItem"
  ],
  generateID: () => nanoid()
});

export { UniqueID };
