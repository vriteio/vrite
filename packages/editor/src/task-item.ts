import { TaskItem as BaseTaskItem } from "@tiptap/extension-task-item";

const TaskItem = BaseTaskItem.extend({
  content: "paragraph block*",
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      Tab: () => this.editor.commands.sinkListItem(this.name)
    };
  }
});

export { TaskItem };
