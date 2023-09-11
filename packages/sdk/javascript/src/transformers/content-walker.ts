/* eslint-disable no-use-before-define */
type BoldMark = {
  type: "bold";
  attrs: {};
};
type ItalicMark = {
  type: "italic";
  attrs: {};
};
type StrikeMark = {
  type: "strike";
  attrs: {};
};
type CodeMark = {
  type: "code";
  attrs: {};
};
type LinkMark = {
  type: "link";
  attrs: {
    href: string;
  };
};
type HighlightMark = {
  type: "highlight";
  attrs: {};
};
type SubscriptMark = {
  type: "subscript";
  attrs: {};
};
type SuperscriptMark = {
  type: "superscript";
  attrs: {};
};
type CommentMark = {
  type: "comment";
  attrs: {
    thread: string;
  };
};
type JSONContentMark = {
  bold: BoldMark;
  italic: ItalicMark;
  strike: StrikeMark;
  code: CodeMark;
  link: LinkMark;
  highlight: HighlightMark;
  subscript: SubscriptMark;
  superscript: SuperscriptMark;
  comment: CommentMark;
};
type TextNode = {
  type: "text";
  text: string;
  marks?: Array<
    | BoldMark
    | ItalicMark
    | StrikeMark
    | CodeMark
    | LinkMark
    | HighlightMark
    | SubscriptMark
    | SuperscriptMark
    | CommentMark
  >;
};
type HardBreakNode = {
  type: "hardBreak";
};
type ParagraphNode = {
  type: "paragraph";
  content?: Array<TextNode | HardBreakNode>;
};
type HeadingNode = {
  type: "heading";
  attrs: {
    level: 1 | 2 | 3 | 4 | 5 | 6;
  };
  content?: TextNode[];
};
type BlockquoteNode = {
  type: "blockquote";
  content?: Array<
    | ParagraphNode
    | HeadingNode
    | BlockquoteNode
    | WrapperNode
    | ImageNode
    | CodeBlockNode
    | EmbedNode
    | BulletListNode
    | OrderedListNode
    | TaskListNode
    | HorizontalRuleNode
    | TableNode
  >;
};
type WrapperNode = {
  type: "wrapper";
  attrs?: {
    key?: string;
  };
  content?: Array<
    | ParagraphNode
    | HeadingNode
    | BlockquoteNode
    | WrapperNode
    | ImageNode
    | CodeBlockNode
    | EmbedNode
    | BulletListNode
    | OrderedListNode
    | TaskListNode
    | HorizontalRuleNode
    | TableNode
  >;
};
type ImageNode = {
  type: "image";
  attrs?: {
    src?: string;
    alt?: string;
  };
};
type CodeBlockNode = {
  type: "codeBlock";
  attrs?: {
    lang: string;
  };
  content: TextNode[];
};
type EmbedNode = {
  type: "embed";
  attrs?: {
    embed: "codepen" | "codesandbox" | "youtube";
    input?: string;
    src?: string;
  };
};
type BulletListNode = {
  type: "bulletList";
  content: ListItemNode[];
};
type OrderedListNode = {
  type: "orderedList";
  attrs: {
    start: number;
  };
  content: ListItemNode[];
};
type TaskListNode = {
  type: "taskList";
  content: TaskItemNode[];
};
type ListItemNode = {
  type: "listItem";
  content: Array<
    | ParagraphNode
    | HeadingNode
    | ImageNode
    | CodeBlockNode
    | EmbedNode
    | BulletListNode
    | OrderedListNode
    | TaskListNode
    | HorizontalRuleNode
    | TableNode
  >;
};
type TaskItemNode = {
  type: "taskItem";
  attrs: {
    checked: boolean;
  };
  content: Array<
    | ParagraphNode
    | HeadingNode
    | ImageNode
    | CodeBlockNode
    | EmbedNode
    | BulletListNode
    | OrderedListNode
    | TaskListNode
    | HorizontalRuleNode
    | TableNode
  >;
};
type HorizontalRuleNode = {
  type: "horizontalRule";
};
type TableNode = {
  type: "table";
  content: TableRowNode[];
};
type TableRowNode = {
  type: "tableRow";
  content: Array<TableCellNode | TableHeaderNode>;
};
type TableCellNode = {
  type: "tableCell";
  content: ParagraphNode[];
  attrs: {
    colspan: number;
    rowspan: number;
  };
};
type TableHeaderNode = {
  type: "tableHeader";
  content: ParagraphNode[];
  attrs: {
    colspan: number;
    rowspan: number;
  };
};
type DocNode = {
  type: "doc";
  content: Array<
    | ParagraphNode
    | HeadingNode
    | BlockquoteNode
    | WrapperNode
    | ImageNode
    | CodeBlockNode
    | EmbedNode
    | BulletListNode
    | OrderedListNode
    | TaskListNode
    | HorizontalRuleNode
    | TableNode
  >;
};

type JSONContentNode = {
  text: TextNode;
  hardBreak: HardBreakNode;
  paragraph: ParagraphNode;
  heading: HeadingNode;
  blockquote: BlockquoteNode;
  wrapper: WrapperNode;
  image: ImageNode;
  codeBlock: CodeBlockNode;
  embed: EmbedNode;
  bulletList: BulletListNode;
  orderedList: OrderedListNode;
  taskList: TaskListNode;
  listItem: ListItemNode;
  taskItem: TaskItemNode;
  horizontalRule: HorizontalRuleNode;
  table: TableNode;
  tableRow: TableRowNode;
  tableCell: TableCellNode;
  tableHeader: TableHeaderNode;
  doc: DocNode;
};

type GenericJSONContentMark = {
  type: string;
  attrs?: Record<string, any>;
};
type GenericJSONContentNode = {
  type: string;
  text?: string;
  attrs?: Record<string, any>;
  content?: GenericJSONContentNode[];
  marks?: GenericJSONContentMark[];
};
type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

interface JSONContentNodeWalker<N extends GenericJSONContentNode = GenericJSONContentNode> {
  node: N;
  index: number;
  parent: JSONContentNodeWalker | null;
  children: Array<
    JSONContentNodeWalker<NonNullable<WithRequired<N, "content">["content"]>[number]>
  >;
  ancestors: JSONContentNodeWalker[];
  previousSibling(): JSONContentNodeWalker | null;
  nextSibling(): JSONContentNodeWalker | null;
}

const createContentWalker = (node: GenericJSONContentNode): JSONContentNodeWalker => {
  const createNodeWalker = (
    node: GenericJSONContentNode,
    index: number,
    ancestors: JSONContentNodeWalker[]
  ): JSONContentNodeWalker => {
    const nodeWalker: JSONContentNodeWalker = {
      node,
      index,
      ancestors,
      get parent() {
        return ancestors[ancestors.length - 1] || null;
      },
      get children() {
        if ("content" in node) {
          return (
            node.content?.map((childNode, childNodeIndex) => {
              return createNodeWalker(childNode, childNodeIndex, [...ancestors, nodeWalker]);
            }) || []
          );
        }

        return [];
      },
      previousSibling() {
        if (!this.parent) {
          return null;
        }

        return this.parent.children[this.index - 1] || null;
      },
      nextSibling() {
        if (!this.parent) {
          return null;
        }

        return this.parent.children[this.index + 1] || null;
      }
    };

    return nodeWalker;
  };

  return createNodeWalker(node, 0, []);
};

export { createContentWalker };
export type {
  GenericJSONContentMark,
  GenericJSONContentNode,
  JSONContentNodeWalker,
  JSONContentNode,
  JSONContentMark
};
