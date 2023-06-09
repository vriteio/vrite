import ListItem from "@tiptap/extension-list-item";

const CustomListItem = ListItem.extend({
  content: "paragraph (paragraph|list)*"
});

export { CustomListItem };
