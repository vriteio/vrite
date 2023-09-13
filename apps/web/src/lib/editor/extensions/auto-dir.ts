import { Extension } from "@tiptap/core";

const AutoDir = Extension.create({
  name: "AutoDir",
  addGlobalAttributes() {
    return [
      {
        types: ["heading", "paragraph", "bulletList", "orderedList", "blockquote", "taskList"],
        attributes: {
          autoDir: {
            renderHTML: () => ({
              dir: "auto"
            }),
            parseHTML: (element) => element.dir || "auto"
          }
        }
      }
    ];
  }
});

export { AutoDir };
