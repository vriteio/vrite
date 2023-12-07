import { CodeBlock, Embed, Image, Element } from "./extensions";
import { SlashMenuItem } from "./extensions/slash-menu/component";
import { Editor, Node as NodeExtension, Mark as MarkExtension } from "@tiptap/core";
import { DOMOutputSpec, DOMSerializer, Mark, Node } from "@tiptap/pm/model";
import {
  Heading,
  Link,
  Bold,
  Underline,
  Code,
  Italic,
  HorizontalRule,
  Blockquote,
  Highlight,
  Superscript,
  Subscript,
  Strike,
  BulletList,
  OrderedList,
  TaskList,
  Level,
  TaskItem,
  ListItem,
  Table,
  TableCell,
  TableHeader,
  TableRow
} from "@vrite/editor";
import { HocuspocusProvider } from "@hocuspocus/provider";
import {
  mdiFormatHeader1,
  mdiFormatHeader2,
  mdiFormatHeader3,
  mdiFormatHeader4,
  mdiFormatHeader5,
  mdiFormatHeader6,
  mdiFormatQuoteOpen,
  mdiFormatListBulleted,
  mdiFormatListNumbered,
  mdiFormatListChecks,
  mdiImage,
  mdiCodeTags,
  mdiMinus,
  mdiCodepen,
  mdiYoutube,
  mdiTable,
  mdiCubeOutline
} from "@mdi/js";
import { createRef } from "#lib/utils";
import { App } from "#context";
import { codeSandboxIcon } from "#assets/icons";

const createClipboardSerializer = (
  editor: Editor,
  settings: App.WorkspaceSettings
): DOMSerializer => {
  const base = DOMSerializer.fromSchema(editor.schema);
  const nodes: Record<string, (node: Node) => DOMOutputSpec> = {
    paragraph: base.nodes.paragraph,
    text: base.nodes.text
  };
  const marks: Record<string, (mark: Mark, inline: boolean) => DOMOutputSpec> = {};

  if (settings.embeds.length > 0) {
    nodes.embed = base.nodes.embed;
  }

  Object.entries(base.nodes).forEach(([name, node]) => {
    if (settings.blocks.includes(name as App.WorkspaceSettings["blocks"][number])) {
      if (name === "orderedList" || name === "bulletList") {
        nodes.listItem = base.nodes.listItem;
        nodes;
      } else if (name === "taskList") {
        nodes.taskItem = base.nodes.taskItem;
      } else if (name.startsWith("heading")) {
        nodes.heading = base.nodes.heading;

        return;
      }

      nodes[name] = node;
    }
  });
  Object.entries(base.marks).forEach(([name, mark]) => {
    if (settings.marks.includes(name as App.WorkspaceSettings["marks"][number])) {
      marks[name] = mark;
    }
  });

  return new DOMSerializer(nodes, marks);
};
const createExtensions = (
  settings: App.WorkspaceSettings,
  provider: HocuspocusProvider
): Array<MarkExtension | NodeExtension> => {
  const resetExtensionConfig = {
    addKeyboardShortcuts: () => ({}),
    addPasteRules: () => [],
    addInputRules: () => []
  };
  const marks: Record<App.WorkspaceSettings["marks"][number], MarkExtension> = {
    bold: Bold,
    underline: Underline,
    italic: Italic,
    strike: Strike,
    code: Code,
    link: Link,
    highlight: Highlight,
    subscript: Subscript,
    superscript: Superscript
  };
  const blocks: Record<
    Exclude<App.WorkspaceSettings["blocks"][number], `heading${number}`>,
    NodeExtension | NodeExtension[]
  > = {
    bulletList: BulletList,
    orderedList: OrderedList,
    taskList: TaskList,
    blockquote: Blockquote,
    codeBlock: CodeBlock.configure({ provider }),
    horizontalRule: HorizontalRule,
    image: Image,
    element: Element,
    table: [Table, TableCell, TableHeader, TableRow]
  };
  const getHeadingLevels = (settings: App.WorkspaceSettings): Level[] => {
    return settings.blocks
      .filter((block) => block.startsWith("heading"))
      .map((block) => parseInt(block.slice(-1)))
      .sort((a, b) => a - b) as Level[];
  };
  const getItemNodes = (): NodeExtension[] => {
    const itemNodes: NodeExtension[] = [];

    if (settings.blocks.includes("bulletList") || settings.blocks.includes("orderedList")) {
      itemNodes.push(ListItem);
    } else {
      itemNodes.push(ListItem.extend(resetExtensionConfig));
    }

    if (settings.blocks.includes("taskList")) {
      itemNodes.push(TaskItem);
    } else {
      itemNodes.push(TaskItem.extend(resetExtensionConfig));
    }

    return itemNodes;
  };

  return [
    ...Object.entries(marks).map(([name, extension]) => {
      if (settings.marks.includes(name as App.WorkspaceSettings["marks"][number])) {
        return extension;
      }

      return extension.extend(resetExtensionConfig);
    }),
    ...Object.entries(blocks).flatMap(([name, extension]) => {
      if (settings.blocks.includes(name as App.WorkspaceSettings["blocks"][number])) {
        return Array.isArray(extension) ? extension : [extension];
      }

      if (Array.isArray(extension)) {
        return extension.map((ext) => ext.extend(resetExtensionConfig));
      }

      return extension.extend(resetExtensionConfig);
    }),
    ...(settings.embeds.length > 0 ? [Embed] : []),
    Heading.configure({
      enabledLevels: getHeadingLevels(settings)
    }),
    ...getItemNodes()
  ];
};
const createBlockMenuOptions = (settings?: App.WorkspaceSettings): SlashMenuItem[] => {
  const headingLevels = [1, 2, 3, 4, 5, 6] as const;
  const headingIcons = [
    mdiFormatHeader1,
    mdiFormatHeader2,
    mdiFormatHeader3,
    mdiFormatHeader4,
    mdiFormatHeader5,
    mdiFormatHeader6
  ];
  const blockMenuOptions: SlashMenuItem[] = [
    ...headingLevels.map((headingLevel): SlashMenuItem => {
      return {
        icon: headingIcons[headingLevel - 1],
        label: `Heading ${headingLevel}`,
        group: "Headings",
        block: `heading${headingLevel}`,
        ref: createRef<HTMLElement | null>(null),
        command({ editor, range }) {
          return editor
            .chain()
            .focus()
            .deleteRange(range)
            .setHeading({ level: headingLevel })
            .run();
        }
      };
    }),
    {
      label: "Blockquote",
      group: "Blocks",
      block: "blockquote",
      icon: mdiFormatQuoteOpen,
      ref: createRef<HTMLElement | null>(null),
      command({ editor, range }) {
        return editor.chain().focus().deleteRange(range).setBlockquote().run();
      }
    },
    {
      label: "Bullet List",
      group: "Blocks",
      block: "bulletList",
      icon: mdiFormatListBulleted,
      ref: createRef<HTMLElement | null>(null),
      command({ editor, range }) {
        return editor.chain().focus().deleteRange(range).toggleBulletList().run();
      }
    },
    {
      label: "Ordered List",
      icon: mdiFormatListNumbered,
      group: "Blocks",
      block: "orderedList",
      ref: createRef<HTMLElement | null>(null),
      command({ editor, range }) {
        return editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      }
    },
    {
      label: "Task List",
      icon: mdiFormatListChecks,
      group: "Blocks",
      block: "taskList",
      ref: createRef<HTMLElement | null>(null),
      command({ editor, range }) {
        return editor.chain().focus().deleteRange(range).toggleTaskList().run();
      }
    },
    {
      label: "Table",
      icon: mdiTable,
      group: "Blocks",
      block: "table",
      ref: createRef<HTMLElement | null>(null),
      command({ editor, range }) {
        return editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run();
      }
    },
    {
      label: "Image",
      icon: mdiImage,
      group: "Blocks",
      block: "image",
      ref: createRef<HTMLElement | null>(null),
      command({ editor, range }) {
        return editor.chain().focus().deleteRange(range).insertImage({}).run();
      }
    },
    {
      label: "Code Block",
      icon: mdiCodeTags,
      group: "Blocks",
      block: "codeBlock",
      ref: createRef<HTMLElement | null>(null),
      command({ editor, range }) {
        return editor.chain().focus().deleteRange(range).insertCodeBlock({}).run();
      }
    },
    {
      label: "Horizontal Rule",
      icon: mdiMinus,
      group: "Blocks",
      block: "horizontalRule",
      ref: createRef<HTMLElement | null>(null),
      command({ editor, range }) {
        return editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      }
    },
    {
      label: "Element",
      group: "Blocks",
      block: "element",
      icon: mdiCubeOutline,
      ref: createRef<HTMLElement | null>(null),
      command({ editor, range }) {
        return editor.chain().focus().deleteRange(range).setElement().run();
      }
    },
    {
      label: "CodePen",
      icon: mdiCodepen,
      group: "Embeds",
      embed: "codepen",
      ref: createRef<HTMLElement | null>(null),
      command({ editor, range }) {
        return editor.chain().focus().deleteRange(range).insertEmbed({ embed: "codepen" }).run();
      }
    },
    {
      label: "CodeSandbox",
      icon: codeSandboxIcon,
      group: "Embeds",
      embed: "codesandbox",
      ref: createRef<HTMLElement | null>(null),
      command({ editor, range }) {
        return editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertEmbed({ embed: "codesandbox" })
          .run();
      }
    },
    {
      label: "YouTube",
      icon: mdiYoutube,
      group: "Embeds",
      embed: "youtube",
      ref: createRef<HTMLElement | null>(null),
      command({ editor, range }) {
        return editor.chain().focus().deleteRange(range).insertEmbed({ embed: "youtube" }).run();
      }
    }
  ];

  return blockMenuOptions.filter(({ embed, block }) => {
    if (!settings) return true;

    return (block && settings.blocks.includes(block)) || (embed && settings.embeds.includes(embed));
  }) as SlashMenuItem[];
};

export { createClipboardSerializer, createExtensions, createBlockMenuOptions };
