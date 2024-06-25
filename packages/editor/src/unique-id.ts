import {
  Extension,
  findChildrenInRange,
  findDuplicates,
  getChangedRanges,
  combineTransactionSteps,
  NodeWithPos
} from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Node, Slice, Fragment } from "@tiptap/pm/model";
import { nanoid } from "nanoid";

const UniqueId = Extension.create<{ attributeName: string; types: string[]; createId(): string }>({
  name: "unique-id",
  priority: 99999,
  addOptions: () => ({
    attributeName: "id",
    types: [
      "paragraph",
      "bulletList",
      "orderedList",
      "taskList",
      "blockquote",
      "horizontalRule",
      "image",
      "codeBlock",
      "element",
      "table",
      "tableRow",
      "tableCell",
      "tableHeader",
      "heading",
      "listItem",
      "taskItem"
    ],
    createId: () => nanoid()
  }),
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          [this.options.attributeName]: {
            default: null,
            parseHTML: (element) => element.getAttribute(this.options.attributeName),
            renderHTML: (attributes) => {
              if (!attributes[this.options.attributeName]) {
                return {};
              }

              return {
                [this.options.attributeName]: attributes[this.options.attributeName]
              };
            }
          }
        }
      }
    ];
  },
  addProseMirrorPlugins() {
    let dragSourceElement: HTMLElement | null = null;
    let transformPasted = false;

    return [
      new Plugin({
        key: new PluginKey("unique-id"),

        appendTransaction: (transactions, { doc: oldDoc }, { doc: newDoc, tr }) => {
          if (!transactions.some(({ docChanged }) => docChanged) || oldDoc.eq(newDoc)) return;

          const { types, attributeName, createId } = this.options;
          const transform = combineTransactionSteps(oldDoc, [...transactions]);

          getChangedRanges(transform).forEach(({ newRange, oldRange }) => {
            const affectedNodes = findChildrenInRange(newDoc, newRange, (node) => {
              return types.includes(node.type.name);
            });
            const affectedIds = affectedNodes
              .map(({ node }) => node.attrs[attributeName])
              .filter((id) => id !== null);
            const newNodes: NodeWithPos[] = [];
            const affectedIdsDuplicates = findDuplicates(affectedIds);

            newDoc.nodesBetween(newRange.from, newRange.to, (node, pos) => {
              if (pos >= newRange.from && pos <= newRange.to && types.includes(node.type.name)) {
                newNodes.push({ node, pos });
              }
            });
            newNodes.forEach(({ node, pos }) => {
              const id = node.attrs[attributeName];

              if (id === null) {
                tr.setNodeAttribute(pos, attributeName, createId());

                return;
              }

              if (transform.mapping.invert().mapResult(pos) && affectedIdsDuplicates.includes(id)) {
                tr.setNodeAttribute(pos, attributeName, createId());
              }
            });
          });

          if (!tr.steps.length) return;

          return tr;
        },

        view(view) {
          const handleDragstart = (event: DragEvent): void => {
            const target = event.target as HTMLElement;

            dragSourceElement = null;

            if (view.dom.parentElement?.contains(target)) {
              return;
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
            drop: (view, event) => {
              if (
                dragSourceElement !== view.dom.parentElement ||
                event.dataTransfer?.effectAllowed === "copy"
              ) {
                dragSourceElement = null;
                transformPasted = true;
              }

              return false;
            },
            paste: () => {
              transformPasted = true;

              return false;
            }
          },

          transformPasted: (slice) => {
            if (!transformPasted) return slice;

            const { types, attributeName } = this.options;
            const removeId = (fragment: Fragment): Fragment | undefined => {
              const list: Node[] = [];

              fragment.forEach((node) => {
                if (node.isText) {
                  list.push(node);

                  return;
                }

                if (!types.includes(node.type.name)) {
                  list.push(node.copy(removeId(node.content)));

                  return;
                }

                list.push(
                  node.type.create(
                    {
                      ...node.attrs,
                      [attributeName]: null
                    },
                    removeId(node.content),
                    node.marks
                  )
                );
              });

              return Fragment.from(list);
            };

            transformPasted = false;

            return new Slice(
              removeId(slice.content) || slice.content,
              slice.openStart,
              slice.openEnd
            );
          }
        }
      })
    ];
  }
});

export { UniqueId };
