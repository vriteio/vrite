import { mergeAttributes } from "@tiptap/core";
import { TableCell as BaseTableCell } from "@tiptap/extension-table-cell";

const TableCell = BaseTableCell.extend({
  content: "block+",
  renderHTML({ HTMLAttributes }) {
    return [
      "td",
      mergeAttributes(
        this.options.HTMLAttributes,
        // { style: `max-width:${HTMLAttributes.colwidth}px;` },
        HTMLAttributes
      ),
      0
    ];
  }
});

export { TableCell };
