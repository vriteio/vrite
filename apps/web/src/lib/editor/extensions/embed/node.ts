import { EmbedView } from "./view";
import { SolidNodeViewRenderer } from "@vrite/tiptap-solid";
import { Embed as BaseEmbed, EmbedAttributes } from "@vrite/editor";

const Embed = BaseEmbed.extend({
  addNodeView() {
    return SolidNodeViewRenderer(EmbedView);
  }
});

export { Embed };
export type { EmbedAttributes };
