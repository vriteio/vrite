import { ExtendedRegExpMatchArray, Mark, markInputRule, mergeAttributes } from "@tiptap/core";

interface InlineElementAttributes {
  type?: string;
  props: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    InlineElement: {
      setInlineElement: (attrs?: InlineElementAttributes) => ReturnType;
      toggleInlineElement: (attrs?: InlineElementAttributes) => ReturnType;
      unsetInlineElement: () => ReturnType;
    };
  }
}

const InlineElement = Node.create({
  name: "inlineElement",
  exitable: true,
  inclusive: true,
  addAttributes() {
    return {
      props: {
        default: {},
        parseHTML: (element) => {
          return JSON.parse(element.getAttribute("data-props") || "{}");
        }
      },
      type: {
        default: "Element",
        parseHTML: (element) => {
          return element.getAttribute("data-type");
        }
      }
    };
  },
  parseHTML() {
    return [
      {
        tag: "span[data-element=true]"
      }
    ];
  },
  renderHTML({ mark }) {
    return [
      "span",
      mergeAttributes({
        "data-element": "true",
        "data-type": mark.attrs.type,
        "data-props": JSON.stringify(mark.attrs.props)
      }),
      [
        "span",
        {
          contentEditable: false,
          class:
            "!whitespace-pre-wrap leading-[26px] min-h-6.5 w-full !p-0 !bg-transparent !rounded-0 !text-gray-400 !dark:text-gray-400 cursor-pointer pointer-events-none select-none"
        },
        `<${mark.attrs.type}>`
      ],
      ["span", { class: "px-3" }, 0],
      [
        "span",
        {
          contentEditable: "false",
          class:
            "!whitespace-pre-wrap leading-[26px] min-h-6.5 w-full !p-0 !bg-transparent !rounded-0 !text-gray-400 !dark:text-gray-400 cursor-pointer pointer-events-none select-none"
        },
        `</${mark.attrs.type}>`
      ]
    ];
  },
  addCommands() {
    return {
      setInlineElement: (attrs) => {
        return ({ commands }) => {
          return commands.setMark(this.name, {
            type: "Element",
            props: {},
            ...attrs
          });
        };
      },
      toggleInlineElement: (attrs) => {
        return ({ commands }) => {
          return commands.toggleMark(this.name, attrs);
        };
      },
      unsetInlineElement: () => {
        return ({ commands }) => {
          return commands.unsetMark(this.name);
        };
      }
    };
  },
  addInputRules() {
    const getAttributes = (input: ExtendedRegExpMatchArray): Record<string, any> => {
      const tag = input[1].trim();

      if (tag && tag !== "undefined") {
        return { type: tag, props: {} };
      }

      return {};
    };

    return [
      markInputRule({
        find: /(?:<(.+?)>)((?:.+))(?:<\/\1>)$/,
        type: this.type,
        getAttributes
      })
    ];
  }
});

export { InlineElement };
export type { InlineElementAttributes };
