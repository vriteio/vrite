import { mergeAttributes } from "@tiptap/core";
import { TableHeader as BaseTableHeader } from "@tiptap/extension-table-header";

const TableHeader = BaseTableHeader.extend({
  content: "block+",
  renderHTML({ HTMLAttributes }) {
    return [
      "th",
      mergeAttributes(
        this.options.HTMLAttributes,
        // { style: `max-width:${HTMLAttributes.colwidth}px;` },
        HTMLAttributes
      ),
      0
    ];
  }
});

export { TableHeader };
