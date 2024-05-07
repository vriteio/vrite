import { Table as BaseTable } from "@tiptap/extension-table";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeView } from "@tiptap/pm/view";

const updateColumns = (
  node: ProseMirrorNode,
  colgroup: Element,
  table: HTMLElement,
  cellMinWidth: number,
  overrideCol?: number,
  overrideValue?: any
  // eslint-disable-next-line max-params
): void => {
  let totalWidth = 0;
  let fixedWidth = true;
  let nextDOM = colgroup.firstChild as HTMLElement | null;

  const row = node.firstChild!;

  for (let col = 0, i = 0; i < row.childCount; i += 1) {
    const { colspan, colwidth } = row.child(i).attrs;

    for (let j = 0; j < colspan; j += 1, col += 1) {
      const hasWidth = overrideCol === col ? overrideValue : colwidth && colwidth[j];
      const cssWidth = hasWidth ? `${hasWidth}px` : "";

      totalWidth += hasWidth || cellMinWidth;

      if (!hasWidth) {
        fixedWidth = false;
      }

      if (nextDOM) {
        if (nextDOM.style.width !== cssWidth) {
          nextDOM.style.width = cssWidth;
        }

        nextDOM = nextDOM.nextSibling as HTMLElement | null;
      } else {
        colgroup.appendChild(document.createElement("col")).style.width = cssWidth;
      }
    }
  }

  while (nextDOM) {
    const after = nextDOM.nextSibling;

    nextDOM.parentNode?.removeChild(nextDOM);
    nextDOM = after as HTMLElement | null;
  }

  if (fixedWidth) {
    table.style.width = `${totalWidth + 4}px`;
    table.style.minWidth = "";
  } else {
    table.style.width = "";
    table.style.minWidth = `${totalWidth + 4}px`;
  }
};

class TableView implements NodeView {
  public node: ProseMirrorNode;

  public cellMinWidth: number;

  public dom: HTMLElement;

  public table: HTMLElement;

  public colgroup: Element;

  public contentDOM: HTMLElement;

  public constructor(node: ProseMirrorNode, cellMinWidth: number) {
    const wrapper = document.createElement("div");

    wrapper.className = "tableWrapper w-full h-full";
    this.node = node;
    this.cellMinWidth = cellMinWidth;
    this.dom = document.createElement("div");
    this.dom.className = "relative";
    this.dom.style.display = "inline-grid";
    this.dom.appendChild(wrapper);
    this.table = wrapper.appendChild(document.createElement("table"));
    this.colgroup = this.table.appendChild(document.createElement("colgroup"));
    updateColumns(node, this.colgroup, this.table, cellMinWidth);
    this.contentDOM = this.table.appendChild(document.createElement("tbody"));
  }

  public update(node: ProseMirrorNode): boolean {
    if (node.type !== this.node.type) {
      return false;
    }

    this.node = node;
    updateColumns(node, this.colgroup, this.table, this.cellMinWidth);
    this.table.classList.remove("resizing");

    return true;
  }

  public ignoreMutation(
    mutation: MutationRecord | { type: "selection"; target: Element }
  ): boolean {
    const resizing =
      mutation.type === "attributes" &&
      (mutation.target === this.table || this.colgroup.contains(mutation.target));

    if (resizing && !this.table.classList.contains("resizing")) {
      this.table.classList.add("resizing");
    }

    return resizing;
  }
}

const Table = BaseTable.configure({
  resizable: true,
  cellMinWidth: 100,
  allowTableNodeSelection: true,
  // @ts-ignore
  View: TableView
});

export { Table };
