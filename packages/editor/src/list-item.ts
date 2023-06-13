import { ListItem as BaseListItem } from "@tiptap/extension-list-item";

const ListItem = BaseListItem.extend({
  content: "paragraph list*"
});

export { ListItem };
