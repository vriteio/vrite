import { CollaborationCaret as BaseCollaborationCaret } from "@tiptap/extension-collaboration-caret";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { relativePositionToAbsolutePosition, ySyncPluginKey } from "@tiptap/y-tiptap";
import { createRelativePositionFromJSON } from "yjs";
import { createBlockSelectionShade } from "#editor/ui/block-selection";
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

      state.doc.descendants((node, position, parent) => {
        if (parent !== state.doc) return false;

        const selectsWholeBlock = node.isLeaf
          ? from <= position && to >= position + node.nodeSize
          : from <= position + 1 && to >= position + node.nodeSize - 1;

        // Invisible node markers identify whole selected blocks, including leaf nodes.
        if ((node.type.name === "title" || node.type.isInGroup("block")) && selectsWholeBlock) {
          decorations.push(
            Decoration.node(position, position + node.nodeSize, {
              "class": "collaboration-block-selection-marker",
              "data-collaboration-client": String(clientID)
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

        return decorations;
      }
    },
    props: {
      decorations: (state) => blockSelectionPluginKey.getState(state) || null
    },
    view(view) {
      const shades = new Map<string, ReturnType<typeof createBlockSelectionShade>>();
      const container = view.dom.closest<HTMLElement>("[data-editor-scrollable-container]");

      let localBlockSelection: boolean | null = null;
      let shadeFrame: number | null = null;

      const updateLocalBlockSelection = () => {
        const next = isBlockSelection(view.state.selection);

        if (next === localBlockSelection) return;

        localBlockSelection = next;
        awareness.setLocalStateField("blockSelection", next);
      };
      const updateRemoteSelections = () => {
        const selections = new Map<string, { first: HTMLElement; last: HTMLElement }>();
        const awarenessStates = awareness.getStates();

        shadeFrame = null;

        view.dom
          .querySelectorAll<HTMLElement>(".collaboration-block-selection-marker")
          .forEach((selection) => {
            const clientID = selection.dataset.collaborationClient;

            if (!clientID) return;

            const blocks = selections.get(clientID);

            if (blocks) {
              blocks.last = selection;
            } else {
              selections.set(clientID, { first: selection, last: selection });
            }
          });

        view.dom.querySelectorAll<HTMLElement>(".collaboration-caret").forEach((caret) => {
          const clientID = caret.dataset.collaborationClient;

          caret.classList.toggle(
            "collaboration-caret--block-selection",
            Boolean(clientID && selections.has(clientID))
          );
        });

        if (!container) return;

        selections.forEach(({ first, last }, clientID) => {
          let shade = shades.get(clientID);

          if (!shade) {
            shade = createBlockSelectionShade(container, "collaboration-block-selection-shade", {
              prepend: true
            });
            shade.element.dataset.collaborationClient = clientID;
            shades.set(clientID, shade);
          }

          const color = awarenessStates.get(Number(clientID))?.user?.color;

          shade.element.style.setProperty("--collaboration-color", getCollaborationColor(color));
          shade.show(view.dom, first, last);
        });

        shades.forEach((shade, clientID) => {
          if (!selections.has(clientID)) {
            shade.remove();
            shades.delete(clientID);
          }
        });
      };
      const scheduleRemoteSelectionUpdate = () => {
        if (shadeFrame !== null) cancelAnimationFrame(shadeFrame);

        shadeFrame = requestAnimationFrame(updateRemoteSelections);
      };
      const handleAwarenessUpdate = (update: AwarenessUpdate) => {
        const changedClients = [...update.added, ...update.updated, ...update.removed];

        if (!changedClients.some((clientID) => clientID !== awareness.clientID)) return;

        view.dispatch(view.state.tr.setMeta(blockSelectionPluginKey, true));
      };
      const refreshShades = () => {
        shades.forEach((shade) => shade.refresh());
      };
      const resizeObserver =
        typeof ResizeObserver === "undefined" ? null : new ResizeObserver(refreshShades);

      awareness.on("update", handleAwarenessUpdate);
      window.addEventListener("resize", refreshShades);
      resizeObserver?.observe(view.dom);

      if (container) {
        resizeObserver?.observe(container);
      }

      updateLocalBlockSelection();
      scheduleRemoteSelectionUpdate();

      return {
        update(view, previousState) {
          updateLocalBlockSelection();
          if (
            blockSelectionPluginKey.getState(view.state) !==
            blockSelectionPluginKey.getState(previousState)
          ) {
            scheduleRemoteSelectionUpdate();
          }
        },
        destroy() {
          if (shadeFrame !== null) cancelAnimationFrame(shadeFrame);

          shades.forEach((shade) => shade.remove());
          resizeObserver?.disconnect();
          window.removeEventListener("resize", refreshShades);
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
        class: "collaboration-selection",
        style: `--collaboration-color: ${getCollaborationColor(user.color)}`
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
