import { CollaborationCaret as BaseCollaborationCaret } from "@tiptap/extension-collaboration-caret";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { relativePositionToAbsolutePosition, ySyncPluginKey } from "@tiptap/y-tiptap";
import { createRelativePositionFromJSON } from "yjs";
import { isBlockSelection } from "./block-selection";

type CollaborationUser = {
  color?: string;
  name?: string;
};

type AwarenessState = {
  blockSelection?: boolean;
  cursor?: {
    anchor: Parameters<typeof createRelativePositionFromJSON>[0];
    head: Parameters<typeof createRelativePositionFromJSON>[0];
  };
  user?: CollaborationUser;
};

type AwarenessUpdate = {
  added: number[];
  removed: number[];
  updated: number[];
};

type Awareness = {
  clientID: number;
  getStates(): Map<number, AwarenessState>;
  setLocalStateField(field: string, value: unknown): void;
  on(event: "update", listener: (update: AwarenessUpdate) => void): void;
  off(event: "update", listener: (update: AwarenessUpdate) => void): void;
};

const blockSelectionPluginKey = new PluginKey<DecorationSet>("collaborationBlockSelection");
const DEFAULT_COLLABORATION_COLOR = "#f59e0b";
const getCollaborationColor = (color?: string) => {
  return color && /^#[\da-f]{6}$/i.test(color) ? color : DEFAULT_COLLABORATION_COLOR;
};

const createCaret = (user: CollaborationUser, clientID?: number): HTMLElement => {
  const color = getCollaborationColor(user.color);
  const name = user.name || "Anonymous";
  const caret = document.createElement("span");
  const label = document.createElement("span");

  caret.className = "collaboration-caret";
  caret.style.setProperty("--collaboration-color", color);
  caret.setAttribute("aria-label", name);

  if (clientID !== undefined) {
    caret.dataset.collaborationClient = String(clientID);
  }
  label.className = "collaboration-caret__label";
  label.textContent = name;
  caret.append(label);

  return caret;
};

const createBlockSelectionPlugin = (awareness: Awareness) => {
  const createDecorations = (state: EditorState): DecorationSet => {
    const syncState = ySyncPluginKey.getState(state);

    if (!syncState?.doc || !syncState.type || !syncState.binding?.mapping) {
      return DecorationSet.empty;
    }

    const decorations: Decoration[] = [];

    awareness.getStates().forEach((awarenessState, clientID) => {
      if (
        clientID === awareness.clientID ||
        !awarenessState.blockSelection ||
        !awarenessState.cursor
      ) {
        return;
      }

      const anchor = relativePositionToAbsolutePosition(
        syncState.doc,
        syncState.type,
        createRelativePositionFromJSON(awarenessState.cursor.anchor),
        syncState.binding.mapping
      );
      const head = relativePositionToAbsolutePosition(
        syncState.doc,
        syncState.type,
        createRelativePositionFromJSON(awarenessState.cursor.head),
        syncState.binding.mapping
      );

      if (anchor === null || head === null || anchor === head) return;

      const from = Math.min(anchor, head);
      const to = Math.max(anchor, head);
      const user = awarenessState.user || {};

      state.doc.descendants((node, position, parent) => {
        if (parent !== state.doc) return false;

        const selectsWholeBlock = node.isLeaf
          ? from <= position && to >= position + node.nodeSize
          : from <= position + 1 && to >= position + node.nodeSize - 1;

        // Mirror full collaborative block selections with node decorations. Inline
        // decorations alone cannot cover leaf nodes such as horizontal rules and
        // don't match the editor's local block-selection treatment.
        if ((node.type.name === "title" || node.type.isInGroup("block")) && selectsWholeBlock) {
          decorations.push(
            Decoration.node(position, position + node.nodeSize, {
              "class": "collaboration-block-selection",
              "style": `--collaboration-color: ${getCollaborationColor(user.color)}`,
              "data-collaboration-client": String(clientID),
              "data-collaboration-user": user.name || "Anonymous"
            })
          );
        }

        return false;
      });
    });

    return DecorationSet.create(state.doc, decorations);
  };

  return new Plugin<DecorationSet>({
    key: blockSelectionPluginKey,
    state: {
      init: (_, state) => createDecorations(state),
      apply(transaction, decorations, _oldState, newState) {
        if (transaction.docChanged || transaction.getMeta(blockSelectionPluginKey)) {
          return createDecorations(newState);
        }

        return decorations.map(transaction.mapping, transaction.doc);
      }
    },
    props: {
      decorations: (state) => blockSelectionPluginKey.getState(state) || null
    },
    view(view) {
      let localBlockSelection: boolean | null = null;

      const updateLocalBlockSelection = () => {
        const next = isBlockSelection(view.state.selection);

        if (next === localBlockSelection) return;

        localBlockSelection = next;
        awareness.setLocalStateField("blockSelection", next);
      };
      const updateCaretVisibility = () => {
        const carets = view.dom.querySelectorAll<HTMLElement>(".collaboration-caret");

        carets.forEach((caret) => {
          caret.classList.remove("collaboration-caret--block-selection");
        });
        view.dom
          .querySelectorAll<HTMLElement>(".collaboration-block-selection")
          .forEach((selection) => {
            const clientID = selection.dataset.collaborationClient;

            if (!clientID) return;

            carets.forEach((caret) => {
              if (caret.dataset.collaborationClient === clientID) {
                caret.classList.add("collaboration-caret--block-selection");
              }
            });
          });
      };
      const handleAwarenessUpdate = (update: AwarenessUpdate) => {
        const changedClients = [...update.added, ...update.updated, ...update.removed];

        if (!changedClients.some((clientID) => clientID !== awareness.clientID)) return;

        view.dispatch(view.state.tr.setMeta(blockSelectionPluginKey, true));
      };

      awareness.on("update", handleAwarenessUpdate);
      updateLocalBlockSelection();
      updateCaretVisibility();

      return {
        update() {
          updateLocalBlockSelection();
          updateCaretVisibility();
        },
        destroy() {
          awareness.off("update", handleAwarenessUpdate);
          awareness.setLocalStateField("blockSelection", null);
        }
      };
    }
  });
};

const CollaborationCaret = BaseCollaborationCaret.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      render: createCaret,
      selectionRender: (user: CollaborationUser) => ({
        "class": "collaboration-selection",
        "style": `--collaboration-color: ${getCollaborationColor(user.color)}`,
        "data-collaboration-user": user.name || "Anonymous"
      })
    };
  },
  addProseMirrorPlugins() {
    const awareness = this.options.provider?.awareness as Awareness | undefined;
    const parentPlugins = this.parent?.() || [];

    // Publish the selection kind before yCursorPlugin publishes its matching range.
    return awareness ? [createBlockSelectionPlugin(awareness), ...parentPlugins] : parentPlugins;
  }
});

export { CollaborationCaret };
