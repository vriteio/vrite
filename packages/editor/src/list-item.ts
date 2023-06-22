import { ListItem as BaseListItem } from "@tiptap/extension-list-item";

const ListItem = BaseListItem.extend({
  content: "paragraph block*"
});

export { ListItem };
