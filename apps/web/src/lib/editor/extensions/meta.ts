import { Extension } from "@tiptap/core";

const MetaAttribute = Extension.create({
  name: "MetaAttribute",
  addGlobalAttributes() {
    return [
      {
        types: ["codeBlock", "element"],
        attributes: {
          _: {
            default: null,
            rendered: false
          }
        }
      }
    ];
  }
});

export { MetaAttribute };
