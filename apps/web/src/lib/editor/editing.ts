import { CodeBlock, Embed, Heading, Image, Level } from "./extensions";
import { SlashMenuItem } from "./extensions/slash-menu/component";
import { Editor, Node as NodeExtension, Mark as MarkExtension } from "@tiptap/core";
import { DOMOutputSpec, DOMSerializer, Mark, Node } from "@tiptap/pm/model";
import { Link } from "@tiptap/extension-link";
import { Blockquote } from "@tiptap/extension-blockquote";
import { Bold } from "@tiptap/extension-bold";
import { BulletList } from "@tiptap/extension-bullet-list";
import { Code } from "@tiptap/extension-code";
import { Highlight } from "@tiptap/extension-highlight";
import { HorizontalRule } from "@tiptap/extension-horizontal-rule";
import { Italic } from "@tiptap/extension-italic";
import { ListItem } from "@tiptap/extension-list-item";
import { OrderedList } from "@tiptap/extension-ordered-list";
import { Strike } from "@tiptap/extension-strike";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
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
  mdiYoutube
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
    italic: Italic,
    strike: Strike,
    code: Code,
    link: Link.configure({ openOnClick: false }),
    highlight: Highlight,
    subscript: Subscript,
    superscript: Superscript
  };
  const blocks: Record<
    Exclude<App.WorkspaceSettings["blocks"][number], `heading${number}`>,
    NodeExtension
  > = {
    bulletList: BulletList,
    orderedList: OrderedList,
    taskList: TaskList,
    blockquote: Blockquote,
    codeBlock: CodeBlock.configure({ provider }),
    horizontalRule: HorizontalRule,
    image: Image
  };
  const getHeadingLevels = (settings: App.WorkspaceSettings): Level[] => {
    return settings.blocks
      .filter((block) => block.startsWith("heading"))
      .map((block) => parseInt(block.slice(-1)))
      .sort((a, b) => a - b) as Level[];
  };
  const getItemNodes = (): NodeExtension[] => {
    const CustomTaskItem = TaskItem.extend({
      content: "paragraph"
    });
    const CustomListItem = ListItem.extend({
      content: "paragraph (paragraph|list)*"
    });
    const itemNodes: NodeExtension[] = [];

    if (settings.blocks.includes("bulletList") || settings.blocks.includes("orderedList")) {
      itemNodes.push(CustomListItem);
    } else {
      itemNodes.push(CustomListItem.extend(resetExtensionConfig));
    }

    if (settings.blocks.includes("taskList")) {
      itemNodes.push(CustomTaskItem);
    } else {
      itemNodes.push(CustomTaskItem.extend(resetExtensionConfig));
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
    ...Object.entries(blocks).map(([name, extension]) => {
      if (settings.blocks.includes(name as App.WorkspaceSettings["blocks"][number])) {
        return extension;
      }

      return extension.extend(resetExtensionConfig);
    }),
    ...getItemNodes(),
    ...(settings.embeds.length > 0 ? [Embed] : []),
    Heading.extend({ content: "text*", marks: "" }).configure({
      enabledLevels: getHeadingLevels(settings)
    })
  ];
};
const createBlockMenuOptions = (settings: App.WorkspaceSettings): SlashMenuItem[] => {
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
    return (block && settings.blocks.includes(block)) || (embed && settings.embeds.includes(embed));
  }) as SlashMenuItem[];
};

export { createClipboardSerializer, createExtensions, createBlockMenuOptions };
