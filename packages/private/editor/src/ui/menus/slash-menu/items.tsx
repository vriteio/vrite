import { createRef } from "@andesine/components";
import type { SlashMenuItem } from "./component";

const createSlashMenuItems = (): SlashMenuItem[] => {
  const headingLevels = [1, 2, 3, 4, 5, 6] as const;
  const headingIcons = [
    "i-lucide:heading-1",
    "i-lucide:heading-2",
    "i-lucide:heading-3",
    "i-lucide:heading-4",
    "i-lucide:heading-5",
    "i-lucide:heading-6"
  ];

  return [
    ...headingLevels.map((headingLevel): SlashMenuItem => ({
      icon: headingIcons[headingLevel - 1],
      label: `Heading ${headingLevel}`,
      group: "Headings",
      markdown: "#".repeat(headingLevel),
      shortcut: `$mod+alt+${headingLevel}`,
      ref: createRef<HTMLElement | null>(null),
      command({ editor, range }) {
        return editor.chain().focus().deleteRange(range).setHeading({ level: headingLevel }).run();
      }
    })),
    {
      label: "Bullet List",
      group: "Lists",
      markdown: "- ",
      shortcut: "$mod+shift+8",
      icon: "i-lucide:list",
      ref: createRef<HTMLElement | null>(null),
      command({ editor, range }) {
        return editor.chain().focus().deleteRange(range).toggleBulletList().run();
      }
    },
    {
      label: "Ordered List",
      icon: "i-lucide:list-ordered",
      group: "Lists",
      markdown: "1. ",
      shortcut: "$mod+shift+7",
      ref: createRef<HTMLElement | null>(null),
      command({ editor, range }) {
        return editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      }
    },
    {
      label: "Task List",
      icon: "i-lucide:list-checks",
      group: "Lists",
      markdown: "[] ",
      shortcut: "$mod+shift+9",
      ref: createRef<HTMLElement | null>(null),
      command({ editor, range }) {
        return editor.chain().focus().deleteRange(range).toggleTaskList().run();
      }
    },
    {
      label: "Blockquote",
      group: "Blocks",
      markdown: "> ",
      shortcut: "$mod+shift+b",
      icon: "i-lucide:text-quote",
      ref: createRef<HTMLElement | null>(null),
      command({ editor, range }) {
        return editor.chain().focus().deleteRange(range).setBlockquote().run();
      }
    },
    {
      label: "Horizontal Rule",
      icon: "i-lucide:minus",
      group: "Blocks",
      markdown: "---",
      ref: createRef<HTMLElement | null>(null),
      command({ editor, range }) {
        return editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      }
    }
  ];
};

export { createSlashMenuItems };
