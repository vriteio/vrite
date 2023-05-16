import {
  mdiFormatBold,
  mdiFormatItalic,
  mdiFormatStrikethrough,
  mdiCodeTags,
  mdiLinkVariant,
  mdiFormatColorHighlight,
  mdiFormatSubscript,
  mdiFormatSuperscript,
  mdiFormatHeader1,
  mdiFormatHeader2,
  mdiFormatHeader3,
  mdiFormatHeader4,
  mdiFormatHeader5,
  mdiFormatHeader6,
  mdiFormatListBulleted,
  mdiFormatListNumbered,
  mdiFormatListCheckbox,
  mdiFormatQuoteClose,
  mdiImage,
  mdiMinus,
  mdiCodepen,
  mdiYoutube
} from "@mdi/js";
import { codeSandboxIcon } from "#assets/icons";
import { App } from "#context";

const marks: Array<{
  icon: string;
  label: string;
  value: App.WorkspaceSettings["marks"][number];
}> = [
  {
    icon: mdiFormatBold,
    value: "bold",
    label: "Bold"
  },
  {
    icon: mdiFormatItalic,
    value: "italic",
    label: "Italic"
  },
  {
    icon: mdiFormatStrikethrough,
    value: "strike",
    label: "Strike"
  },
  {
    icon: mdiCodeTags,
    value: "code",
    label: "Code"
  },
  {
    icon: mdiLinkVariant,
    value: "link",
    label: "Link"
  },
  { icon: mdiFormatColorHighlight, value: "highlight", label: "Highlight" },
  { icon: mdiFormatSubscript, value: "subscript", label: "Subscript" },
  { icon: mdiFormatSuperscript, value: "superscript", label: "Superscript" }
];
const blocks: Record<
  string,
  Array<{
    icon: string;
    label: string;
    value: App.WorkspaceSettings["blocks"][number];
  }>
> = {
  headings: [
    { label: "Heading 1", icon: mdiFormatHeader1, value: "heading1" },
    { label: "Heading 2", icon: mdiFormatHeader2, value: "heading2" },
    { label: "Heading 3", icon: mdiFormatHeader3, value: "heading3" },
    { label: "Heading 4", icon: mdiFormatHeader4, value: "heading4" },
    { label: "Heading 5", icon: mdiFormatHeader5, value: "heading5" },
    { label: "Heading 6", icon: mdiFormatHeader6, value: "heading6" }
  ],
  lists: [
    {
      label: "Bullet List",
      icon: mdiFormatListBulleted,
      value: "bulletList"
    },
    {
      label: "Numbered List",
      icon: mdiFormatListNumbered,
      value: "orderedList"
    },
    { label: "Task List", icon: mdiFormatListCheckbox, value: "taskList" }
  ],
  others: [
    { label: "Blockquote", icon: mdiFormatQuoteClose, value: "blockquote" },
    { label: "Code Block", icon: mdiCodeTags, value: "codeBlock" },
    { label: "Image", icon: mdiImage, value: "image" },
    { label: "Horizontal Rule", icon: mdiMinus, value: "horizontalRule" }
  ]
};
const embeds: Array<{
  icon: string;
  label: string;
  value: App.WorkspaceSettings["embeds"][number];
}> = [
  {
    icon: mdiCodepen,
    label: "CodePen",
    value: "codepen"
  },
  {
    icon: codeSandboxIcon,
    label: "CodeSandbox",
    value: "codesandbox"
  },
  {
    icon: mdiYoutube,
    label: "YouTube",
    value: "youtube"
  }
];

export { marks, blocks, embeds };
