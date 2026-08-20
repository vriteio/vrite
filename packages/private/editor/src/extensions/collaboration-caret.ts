import { CollaborationCaret as BaseCollaborationCaret } from "@tiptap/extension-collaboration-caret";
import { GapCursor } from "@tiptap/pm/gapcursor";
import {
  NodeSelection,
  Plugin,
  PluginKey,
  type EditorState,
  type Selection
} from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import {
  absolutePositionToRelativePosition,
  relativePositionToAbsolutePosition,
  yCursorPluginKey,
  ySyncPluginKey
} from "@tiptap/y-tiptap";
import { createRelativePositionFromJSON } from "yjs";
import { createBlockSelectionShade } from "#editor/ui/block-selection";
import { forEachSelectedBlock, selectionCoversNode } from "#editor/ui/block-utils";
import { isBlockSelection } from "./block-selection";

interface CollaborationUser {
  color?: string;
  name?: string;
}

interface AwarenessSelection {
  anchor: Parameters<typeof createRelativePositionFromJSON>[0];
  head: Parameters<typeof createRelativePositionFromJSON>[0];
}

interface CollaborationSelection extends AwarenessSelection {
  depth?: number;
  type: "block" | "gap" | "node";
}

interface AwarenessState {
  collaborationSelection?: CollaborationSelection | null;
  cursor?: AwarenessSelection;
  user?: CollaborationUser;
}

interface Awareness {
  clientID: number;
  getStates(): Map<number, AwarenessState>;
  setLocalStateField(field: string, value: unknown): void;
}

interface LocalCollaborationSelection {
  depth?: number;
  from: number;
  to: number;
  type: CollaborationSelection["type"];
}

const collaborationSelectionPluginKey = new PluginKey<DecorationSet>("collaborationSelection");
const DEFAULT_COLLABORATION_COLOR = "#f59e0b";
const getCollaborationColor = (color?: string) => {
  return color && /^#[\da-f]{6}$/i.test(color) ? color : DEFAULT_COLLABORATION_COLOR;
};
const getLocalCollaborationSelection = (
  selection: Selection
): LocalCollaborationSelection | null => {
  if (isBlockSelection(selection)) {
    return {
      depth: selection.depth,
      from: selection.from,
      to: selection.to,
      type: "block"
    };
  }

  if (selection instanceof GapCursor) {
    return { from: selection.from, to: selection.to, type: "gap" };
  }

  if (
    selection instanceof NodeSelection &&
    ["fragment", "property"].includes(selection.node.type.name)
  ) {
    return { from: selection.from, to: selection.to, type: "node" };
  }

  return null;
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
const createGapCursor = (user: CollaborationUser, clientID: number): HTMLElement => {
  const cursor = document.createElement("span");

  cursor.className = "collaboration-gap-cursor";
  cursor.dataset.collaborationClient = String(clientID);
  cursor.style.setProperty("--collaboration-color", getCollaborationColor(user.color));

  return cursor;
};

const createCollaborationSelectionPlugin = (awareness: Awareness) => {
  const createDecorations = (state: EditorState): DecorationSet => {
    const syncState = ySyncPluginKey.getState(state);

    if (!syncState?.doc || !syncState.type || !syncState.binding?.mapping) {
      return DecorationSet.empty;
    }

    const decorations: Decoration[] = [];

    awareness.getStates().forEach((awarenessState, clientID) => {
      if (clientID === awareness.clientID) return;

      const collaborationSelection = awarenessState.collaborationSelection;
      const relativeSelection = collaborationSelection || awarenessState.cursor;

      if (!relativeSelection) return;

      const anchor = relativePositionToAbsolutePosition(
        syncState.doc,
        syncState.type,
        createRelativePositionFromJSON(relativeSelection.anchor),
        syncState.binding.mapping
      );
      const head = relativePositionToAbsolutePosition(
        syncState.doc,
        syncState.type,
        createRelativePositionFromJSON(relativeSelection.head),
        syncState.binding.mapping
      );

      if (anchor === null || head === null) return;

      const from = Math.min(anchor, head);
      const to = Math.max(anchor, head);

      if (collaborationSelection?.type === "node") {
        const node = state.doc.nodeAt(from);
        const supportedNode = node && ["fragment", "property"].includes(node.type.name);

        if (supportedNode && to === from + node.nodeSize) {
          decorations.push(
            Decoration.node(from, to, {
              "data-collaboration-client": `${clientID}`,
              "class": "collaboration-node-selection",
              "style": `--collaboration-color: ${getCollaborationColor(awarenessState.user?.color)}`
            })
          );
        }

        return;
      }

      if (collaborationSelection?.type === "block") {
        forEachSelectedBlock(
          state.doc,
          from,
          to,
          (node, position) => {
            const selectsWholeBlock = selectionCoversNode(node, position, from, to);

            // Invisible node markers identify whole selected blocks, including leaf nodes.
            if (selectsWholeBlock) {
              decorations.push(
                Decoration.node(position, position + node.nodeSize, {
                  "class": "collaboration-block-selection-marker",
                  "data-collaboration-client": String(clientID)
                })
              );
            }
          },
          { includeCoveredFragments: collaborationSelection.depth !== 1 }
        );

        return;
      }

      if (collaborationSelection?.type === "gap") {
        decorations.push(
          Decoration.widget(head, () => createGapCursor(awarenessState.user || {}, clientID), {
            key: `collaboration-gap-cursor-${clientID}`,
            side: 10
          })
        );
      }
    });

    return DecorationSet.create(state.doc, decorations);
  };

  return new Plugin<DecorationSet>({
    key: collaborationSelectionPluginKey,
    state: {
      init: (_, state) => createDecorations(state),
      apply(transaction, decorations, _oldState, newState) {
        if (transaction.docChanged || transaction.getMeta(yCursorPluginKey)) {
          return createDecorations(newState);
        }

        return decorations;
      }
    },
    props: {
      decorations: (state) => collaborationSelectionPluginKey.getState(state) || null
    },
    view(view) {
      const shades = new Map<string, ReturnType<typeof createBlockSelectionShade>>();
      const container = view.dom.closest<HTMLElement>("[data-editor-scrollable-container]");

      let localSelection: LocalCollaborationSelection | null | undefined;
      let shadeFrame: number | null = null;

      const updateLocalSelection = (documentChanged = false) => {
        const nextSelection = getLocalCollaborationSelection(view.state.selection);
        const selectionChanged =
          localSelection === undefined ||
          localSelection?.type !== nextSelection?.type ||
          localSelection?.depth !== nextSelection?.depth ||
          localSelection?.from !== nextSelection?.from ||
          localSelection?.to !== nextSelection?.to;

        if (!(selectionChanged || (nextSelection && documentChanged))) return;

        if (!nextSelection) {
          localSelection = null;
          awareness.setLocalStateField("collaborationSelection", null);
          return;
        }

        const syncState = ySyncPluginKey.getState(view.state);

        if (!syncState?.type || !syncState.binding?.mapping) return;

        localSelection = nextSelection;
        awareness.setLocalStateField("collaborationSelection", {
          anchor: absolutePositionToRelativePosition(
            nextSelection.from,
            syncState.type,
            syncState.binding.mapping
          ),
          depth: nextSelection.depth,
          head: absolutePositionToRelativePosition(
            nextSelection.to,
            syncState.type,
            syncState.binding.mapping
          ),
          type: nextSelection.type
        } satisfies CollaborationSelection);
      };
      const updateRemoteSelections = () => {
        const selections = new Map<string, { first: HTMLElement; last: HTMLElement }>();
        const gapSelections = new Set<string>();
        const nodeSelections = new Set<string>();
        const awarenessStates = awareness.getStates();
        const carets: HTMLElement[] = [];

        shadeFrame = null;

        view.dom
          .querySelectorAll<HTMLElement>(
            ".collaboration-block-selection-marker, .collaboration-gap-cursor, .collaboration-node-selection, .collaboration-caret"
          )
          .forEach((element) => {
            const clientID = element.dataset.collaborationClient;

            if (!clientID) return;

            if (element.classList.contains("collaboration-block-selection-marker")) {
              const blocks = selections.get(clientID);

              if (blocks) {
                blocks.last = element;
              } else {
                selections.set(clientID, { first: element, last: element });
              }
            } else if (element.classList.contains("collaboration-gap-cursor")) {
              gapSelections.add(clientID);
            } else if (element.classList.contains("collaboration-node-selection")) {
              nodeSelections.add(clientID);
            } else {
              carets.push(element);
            }
          });

        carets.forEach((caret) => {
          const clientID = caret.dataset.collaborationClient!;

          caret.classList.toggle("collaboration-caret--block-selection", selections.has(clientID));
          caret.classList.toggle("collaboration-caret--gap-cursor", gapSelections.has(clientID));
          caret.classList.toggle(
            "collaboration-caret--node-selection",
            nodeSelections.has(clientID)
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
        if (shadeFrame !== null) return;

        shadeFrame = requestAnimationFrame(updateRemoteSelections);
      };
      const refreshShades = () => {
        shades.forEach((shade) => shade.refresh());
      };
      const resizeObserver =
        typeof ResizeObserver === "undefined" ? null : new ResizeObserver(refreshShades);

      window.addEventListener("resize", refreshShades);
      resizeObserver?.observe(view.dom);

      if (container) {
        resizeObserver?.observe(container);
      }

      updateLocalSelection();
      scheduleRemoteSelectionUpdate();

      return {
        update(view, previousState) {
          updateLocalSelection(view.state.doc !== previousState.doc);
          if (
            collaborationSelectionPluginKey.getState(view.state) !==
            collaborationSelectionPluginKey.getState(previousState)
          ) {
            scheduleRemoteSelectionUpdate();
          }
        },
        destroy() {
          if (shadeFrame !== null) cancelAnimationFrame(shadeFrame);

          shades.forEach((shade) => shade.remove());
          resizeObserver?.disconnect();
          window.removeEventListener("resize", refreshShades);
          awareness.setLocalStateField("collaborationSelection", null);
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

    // Publish special selections even when controls outside the editor have focus.
    return awareness
      ? [createCollaborationSelectionPlugin(awareness), ...parentPlugins]
      : parentPlugins;
  }
});

export { CollaborationCaret };
