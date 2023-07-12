import { SolidEditor } from "@vrite/tiptap-solid";
import { EditorState, Plugin, PluginKey } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";
import tippy, { Instance } from "tippy.js";
import { posToDOMRect } from "@tiptap/core";
import { Setter } from "solid-js";
import "tippy.js/animations/scale-subtle.css";
import "tippy.js/animations/shift-away-subtle.css";

interface LinkPreviewOptions {
  editor: SolidEditor;
  element: HTMLElement;
}

class LinkPreview {
  private editor: SolidEditor;

  private element: HTMLElement;

  private view: EditorView;

  private tippy: Instance | undefined;

  private setLink: Setter<string>;

  public constructor(options: LinkPreviewOptions, setLink: Setter<string>) {
    this.editor = options.editor;
    this.view = options.editor.view;
    this.element = options.element;
    this.setLink = setLink;
    this.element.remove();
    this.element.style.visibility = "visible";
  }

  public destroy(): void {
    this.tippy?.destroy();
    this.element.remove();
  }

  public update(view: EditorView, oldState?: EditorState): void {
    const { state, composing } = view;
    const { doc, selection } = state;
    const isSame = oldState && oldState.doc.eq(doc) && oldState.selection.eq(selection);

    if (composing || isSame) {
      return;
    }

    this.createTooltip();

    if (selection.empty) {
      const node = this.view.state.doc.nodeAt(selection.from);
      const linkMark = node?.marks.find((mark) => mark.type === this.editor.schema.marks.link);

      if (node && linkMark) {
        const startPosition = selection.from - selection.$from.textOffset;

        this.setLink(linkMark.attrs.href);
        this.setTooltipPosition(startPosition, startPosition + node.nodeSize);
        this.show();
      } else {
        this.hide();
      }
    } else {
      this.hide();
    }
  }

  private setTooltipPosition(from: number, to: number): void {
    this.tippy?.setProps({
      getReferenceClientRect: () => {
        return posToDOMRect(this.view, from, to);
      }
    });
  }

  private createTooltip(): void {
    const { element: editorElement } = this.editor.options;
    const editorIsAttached = !!editorElement.parentElement;

    if (this.tippy || !editorIsAttached) {
      return;
    }

    this.tippy = tippy(editorElement, {
      onHidden: () => {
        this.setLink("");
      },
      animation: "scale-subtle",
      getReferenceClientRect: null,
      content: this.element,
      interactive: true,
      trigger: "manual",
      placement: "bottom",
      hideOnClick: false
    });
  }

  private show(): void {
    this.tippy?.show();
  }

  private hide(): void {
    this.tippy?.hide();
  }
}

const LinkPreviewPlugin = (options: LinkPreviewOptions, setLink: Setter<string>): Plugin => {
  return new Plugin({
    key: new PluginKey("link-preview"),
    view: () => new LinkPreview(options, setLink)
  });
};

export { LinkPreviewPlugin };
export type { LinkPreviewOptions };
