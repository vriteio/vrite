import {
  CommandManager,
  Editor,
  Extension,
  createChainableState,
  generateJSON
} from "@tiptap/core";
import { EditorState, Plugin } from "@tiptap/pm/state";
import { gfmOutputTransformer } from "@vrite/sdk/transformers";
import { marked } from "marked";
import { Accessor } from "solid-js";
import { App } from "#context";

interface BlockPasteRule {
  acceptLastLineAsEnd?: boolean;
  includeStart?: boolean;
  includeEnd?: boolean;
  start(line: string): boolean;
  end(line: string): boolean;
}
interface RunConfig {
  editor: Editor;
  state: EditorState;
  from: number;
  to: number;
}

const run = (
  config: RunConfig,
  workspaceSettings: Accessor<App.WorkspaceSettings | null>
): boolean => {
  const { editor, state, from, to } = config;
  const enabledBlocks = workspaceSettings()?.blocks || null;
  const allBlockPasteRules: Record<string, BlockPasteRule> = {
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
    taskList: {
      start: (line) => {
        return Boolean(line.match(/^- \[(x|\s)\]\s(.*)$/g));
      },
      end: (line) => {
        const emptyLine = line.trim().length === 0;

        return emptyLine || !line.trim().match(/^- \[(x|\s)\]\s(.*)$/g);
      },
      acceptLastLineAsEnd: true,
      includeStart: true
    },
    orderedList: {
      start: (line) => {
        return Boolean(line.match(/^(\d+)\.\s(.*)$/g));
      },
      end: (line) => {
        const emptyLine = line.trim().length === 0;

        return (
          emptyLine ||
          (line === line.trim() &&
            !(
              Boolean(line.trim().match(/^(\d+)\.\s(.*)$/g)) ||
              Boolean(line.trim().match(/^-\s(.*)$/g))
            ))
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
          (line === line.trim() &&
            !(
              Boolean(line.trim().match(/^-\s(.*)$/g)) ||
              Boolean(line.trim().match(/^(\d+)\.\s(.*)$/g))
            ))
        );
      },
      acceptLastLineAsEnd: true,
      includeStart: true
    },
    table: {
      start: (line) => {
        return Boolean(line.trim().match(/^\|?(?:\s?(.+?)\s?\|){1,}\s?(.+)\|?$/gm));
      },
      end: (line) => {
        return !line.trim().match(/^\|?(?:\s?(.+?)\s?\|){1,}\s?(.+)\|?$/gm);
      },
      includeStart: true,
      includeEnd: false,
      acceptLastLineAsEnd: true
    },
    image: {
      start: (line) => {
        return Boolean(line.trim().match(/^!\[(.*)\]\((.*)\)$/g));
      },
      end: () => true,
      acceptLastLineAsEnd: true,
      includeStart: true
    }
  };
  const blockPasteRules = Object.fromEntries(
    Object.entries(allBlockPasteRules).filter(([key]) => {
      if (!enabledBlocks) return true;

      return enabledBlocks.includes(key as App.WorkspaceSettings["blocks"][number]);
    })
  );
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

  marked.use({
    renderer: {
      paragraph(text) {
        if (text.startsWith("<img")) {
          return `${text}\n`;
        }

        return `<p>${text}</p>`;
      },
      image(href, _title, text) {
        const link = (href || "").replace(
          /^(?:\[.*\]\((.*)\))|(?:(.*))$/,
          (_match, p1, p2) => p1 || p2
        );

        return `<img src="${link}" alt="${text}">`;
      },
      listitem(text, task, checked) {
        return `<li${task ? ` data-type="taskItem"` : ""}${
          checked ? ` data-checked="true"` : ""
        }>${text.replace(/<br><(img|p|pre|blockquote|ul|ol|table)\s/g, "<$1 ")}</li>`;
      },
      list(body, ordered, start) {
        const type = ordered ? "ol" : "ul";
        const startAt = ordered && start !== 1 ? ` start="${start}"` : "";
        const dataType = body.includes(`data-type="taskItem"`) ? ` data-type="taskList"` : "";

        return `<${type}${startAt}${dataType}>${body}</${type}>\n`;
      }
    }
  });
  // eslint-disable-next-line max-params
  state.doc.nodesBetween(from, to, (node, pos, parent, index) => {
    if (!node.isTextblock || node.type.spec.code) {
      return;
    }

    const resolvedFrom = Math.max(from, pos);
    const resolvedTo = Math.min(to, pos + node.content.size);
    const json = node.content?.toJSON();
    const text = node.textBetween(resolvedFrom - pos, resolvedTo - pos, undefined, "\ufffc");
    const textToMatch = json ? gfmOutputTransformer({ type: "doc", content: json }) : text;

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

        const html = marked.parse(lines.join("\n"), {
          breaks: true,
          gfm: true
        });
        const json = generateJSON(html, editor.extensionManager.extensions);

        if (json.content[0].type === activeBlockType) {
          chain()
            .deleteRange({
              from: rangeStart,
              to: rangeEnd
            })
            .insertContentAt(rangeStart, json.content[0]);
        }

        lines = [];
        rangeStart = 0;
        rangeEnd = 0;
        lastData = { text, resolvedFrom };

        if (blockPasteRules[activeBlockType].includeEnd) {
          activeBlockType = "";

          return;
        }

        activeBlockType = "";
      } else {
        lines.push(textToMatch);
        lastData = { text, resolvedFrom };

        return;
      }
    }

    for (const blockPasteRuleType in blockPasteRules) {
      const blockPasteRule = blockPasteRules[blockPasteRuleType as keyof typeof blockPasteRules];
      const match = blockPasteRule.start(textToMatch);

      if (match) {
        const start = resolvedFrom;

        activeBlockType = blockPasteRuleType as keyof typeof blockPasteRules;
        if (blockPasteRules[activeBlockType].includeStart) lines.push(textToMatch);

        rangeStart = state.tr.mapping.map(start);
        lastData = { text, resolvedFrom };
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
const BlockPaste = Extension.create<{ workspaceSettings: Accessor<App.WorkspaceSettings | null> }>({
  addOptions() {
    return {
      workspaceSettings: () => null
    };
  },
  addProseMirrorPlugins() {
    const { editor, options } = this;

    let dragSourceElement: Element | null = null;
    let isPastedFromProseMirror = false;
    let isDroppedFromProseMirror = false;

    return [
      new Plugin({
        view(view) {
          const handleDragstart = (event: DragEvent): void => {
            if (view.dom.parentElement?.contains(event.target as Element)) {
              dragSourceElement = view.dom.parentElement;
            } else {
              dragSourceElement = null;
            }
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
          const [transaction] = transactions;
          const isPaste = transaction.getMeta("uiEvent") === "paste" && !isPastedFromProseMirror;
          const isDrop = transaction.getMeta("uiEvent") === "drop" && !isDroppedFromProseMirror;

          if (!isPaste && !isDrop) {
            return;
          }

          const from = oldState.doc.content.findDiffStart(state.doc.content);
          const to = oldState.doc.content.findDiffEnd(state.doc.content);

          if (typeof from !== "number" || !to || from === to.b) {
            return;
          }

          const { tr } = state;
          const chainableState = createChainableState({
            state,
            transaction: tr
          });
          const handler = run(
            {
              editor,
              state: chainableState,
              from: Math.max(from - 1, 0),
              to: to.b - 1
            },
            options.workspaceSettings
          );

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
