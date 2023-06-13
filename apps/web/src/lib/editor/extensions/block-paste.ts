import {
  CommandManager,
  Editor,
  Extension,
  createChainableState,
  generateJSON
} from "@tiptap/core";
import { EditorState, Plugin } from "@tiptap/pm/state";
import { gfmTransformer } from "@vrite/sdk/transformers";
import { marked } from "marked";

interface BlockPasteRule {
  start(line: string): boolean;
  end(line: string): boolean;
  acceptLastLineAsEnd?: boolean;
  includeStart?: boolean;
  includeEnd?: boolean;
}

const run = (config: { editor: Editor; state: EditorState; from: number; to: number }): boolean => {
  const { editor, state, from, to } = config;
  const blockPasteRules: Record<string, BlockPasteRule> = {
    codeBlock: {
      start: (line) => Boolean(line.match(/^```(.*)$/g)),
      end: (line) => Boolean(line.match(/^```$/g)),
      includeStart: true,
      includeEnd: true
    },
    blockquote: {
      start: (line) => Boolean(line.match(/^>\s(.*)$/g)),
      end: (line) => Boolean(line.match(/^[^>](.*)/g)),
      acceptLastLineAsEnd: true,
      includeStart: true
    },
    orderedList: {
      start: (line) => Boolean(line.match(/^(\d+)\.\s(.*)$/g)),
      end: (line) => {
        const emptyLine = line.trim().length === 0;

        return (
          emptyLine ||
          !(
            Boolean(line.trim().match(/^(\d+)\.\s(.*)$/g)) ||
            Boolean(line.trim().match(/^-\s(.*)$/g))
          )
        );
      },
      acceptLastLineAsEnd: true,
      includeStart: true
    },
    bulletList: {
      start: (line) => Boolean(line.match(/^-\s(.*)$/g)),
      end: (line) => {
        const emptyLine = line.trim().length === 0;

        return (
          emptyLine ||
          !(
            Boolean(line.trim().match(/^-\s(.*)$/g)) ||
            Boolean(line.trim().match(/^(\d+)\.\s(.*)$/g))
          )
        );
      },
      acceptLastLineAsEnd: true,
      includeStart: true
    }
  };
  const { chain } = new CommandManager({
    editor,
    state
  });

  let activeBlockType: keyof typeof blockPasteRules | "" = "";
  let lines: string[] = [];
  let rangeStart = 0;
  let rangeEnd = 0;
  let lastData = null as {
    resolvedFrom: number;
    text: string;
  } | null;

  state.doc.nodesBetween(from, to, (node, pos, parent, index) => {
    if (!node.isTextblock || node.type.spec.code) {
      return;
    }

    const resolvedFrom = Math.max(from, pos);
    const resolvedTo = Math.min(to, pos + node.content.size);
    const jsonContent = node.content?.toJSON();
    const text = node.textBetween(resolvedFrom - pos, resolvedTo - pos, undefined, "\ufffc");
    const textToMatch = jsonContent ? gfmTransformer(...jsonContent) : text;

    if (activeBlockType) {
      const match = blockPasteRules[activeBlockType].end(textToMatch);

      if (match) {
        let end = resolvedFrom;

        if (blockPasteRules[activeBlockType].includeEnd) {
          end += text.length;

          if (text.length) {
            end += 1;
          }
        }

        rangeEnd = state.tr.mapping.map(end);

        if (blockPasteRules[activeBlockType].includeEnd) lines.push(textToMatch);

        const html = marked.parse(lines.join("\n"), { breaks: true, gfm: true });
        const json = generateJSON(html, editor.extensionManager.extensions);

        if (json.content[0].type === activeBlockType) {
          chain()
            .deleteRange({
              from: rangeStart,
              to: rangeEnd
            })
            .insertContentAt(rangeStart, json.content[0]);
        }
        activeBlockType = "";
        lines = [];
        rangeStart = 0;
        rangeEnd = 0;
      } else {
        lines.push(textToMatch);
      }

      lastData = { text, resolvedFrom };

      return;
    }

    for (const blockPasteRuleType in blockPasteRules) {
      const blockPasteRule = blockPasteRules[blockPasteRuleType as keyof typeof blockPasteRules];
      const match = blockPasteRule.start(textToMatch);

      if (match) {
        const start = resolvedFrom;

        activeBlockType = blockPasteRuleType as keyof typeof blockPasteRules;
        if (blockPasteRules[activeBlockType].includeStart) lines.push(textToMatch);
        rangeStart = state.tr.mapping.map(start);
        break;
      }
    }
  });

  if (activeBlockType && blockPasteRules[activeBlockType].acceptLastLineAsEnd && lastData) {
    let end = lastData.resolvedFrom;

    end += lastData.text.length;

    if (lastData.text.length) {
      end += 1;
    }

    rangeEnd = state.tr.mapping.map(end);

    const html = marked.parse(lines.join("\n"), { breaks: true, gfm: true });
    const json = generateJSON(html, editor.extensionManager.extensions);

    if (json.content[0].type === activeBlockType) {
      chain()
        .deleteRange({
          from: rangeStart,
          to: rangeEnd
        })
        .insertContentAt(rangeStart, json.content[0]);
    }
  }

  return true;
};
const BlockPaste = Extension.create({
  addProseMirrorPlugins() {
    const { editor } = this;
    let dragSourceElement: Element | null = null;
    let isPastedFromProseMirror = false;
    let isDroppedFromProseMirror = false;

    return [
      new Plugin({
        view(view) {
          const handleDragstart = (event: DragEvent) => {
            dragSourceElement = view.dom.parentElement?.contains(event.target as Element)
              ? view.dom.parentElement
              : null;
          };

          window.addEventListener("dragstart", handleDragstart);

          return {
            destroy() {
              window.removeEventListener("dragstart", handleDragstart);
            }
          };
        },

        props: {
          handleDOMEvents: {
            drop(view) {
              isDroppedFromProseMirror = dragSourceElement === view.dom.parentElement;

              return false;
            },

            paste(_view, event: Event) {
              const html = (event as ClipboardEvent).clipboardData?.getData("text/html");

              isPastedFromProseMirror = !!html?.includes("data-pm-slice");

              return false;
            }
          }
        },
        appendTransaction(transactions, oldState, state) {
          const transaction = transactions[0];
          const isPaste = transaction.getMeta("uiEvent") === "paste" && !isPastedFromProseMirror;
          const isDrop = transaction.getMeta("uiEvent") === "drop" && !isDroppedFromProseMirror;

          if (!isPaste && !isDrop) {
            return;
          }

          // stop if there is no changed range
          const from = oldState.doc.content.findDiffStart(state.doc.content);
          const to = oldState.doc.content.findDiffEnd(state.doc.content);

          if (typeof from !== "number" || !to || from === to.b) {
            return;
          }

          const tr = state.tr;
          const chainableState = createChainableState({
            state,
            transaction: tr
          });

          const handler = run({
            editor,
            state: chainableState,
            from: Math.max(from - 1, 0),
            to: to.b - 1
          });

          if (!handler || !tr.steps.length) {
            return;
          }

          return tr;
        }
      })
    ];
  }
});

export { BlockPaste };
