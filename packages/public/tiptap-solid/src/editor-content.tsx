import { SolidEditor } from "./editor";
import { SolidRenderer } from "./solid-renderer";
import { createRef } from "./ref";
import { Component, For, createEffect, on, onCleanup, JSX, splitProps } from "solid-js";
import { Dynamic, Portal, render } from "solid-js/web";

interface PortalsProps {
  renderers: SolidRenderer[];
}

const Portals: Component<PortalsProps> = (props) => {
  createEffect<Map<string, () => void>>((renderedViews) => {
    const updatedRenderedViews = new Map<string, () => void>(renderedViews);

    renderedViews?.forEach((unmount, id) => {
      if (props.renderers.some((renderer) => renderer.id === id)) {
        // View already rendered
        return;
      }

      unmount();
      updatedRenderedViews.delete(id);
    });

    props.renderers.forEach((renderer) => {
      if (updatedRenderedViews.has(renderer.id)) {
        // View already rendered
        return;
      }

      updatedRenderedViews.set(
        renderer.id,
        render(
          () => <Dynamic component={renderer.component} state={renderer.state()} />,
          renderer.element
        )
      );
    });

    return updatedRenderedViews;
  });

  return <></>;
};

interface SolidEditorContentProps extends JSX.HTMLAttributes<HTMLDivElement> {
  editor: SolidEditor;
}

const SolidEditorContent: Component<SolidEditorContentProps> = (props) => {
  const [getEditorContentContainer, setEditorContentContainer] = createRef<HTMLElement>();
  const [, passedProps] = splitProps(props, ["editor"]);

  createEffect(
    on([() => props.editor], () => {
      const { editor } = props;

      if (editor && editor.options.element) {
        const editorContentContainer = getEditorContentContainer();

        if (editorContentContainer) {
          editorContentContainer.append(...editor.options.element.childNodes);
          editor.setOptions({
            element: editorContentContainer
          });
        }

        setTimeout(() => {
          if (!editor.isDestroyed) {
            editor.createNodeViews();
          }
        }, 0);
      }
    })
  );
  onCleanup(() => {
    const { editor } = props;

    if (!editor) {
      return;
    }

    if (!editor.isDestroyed) {
      editor.view.setProps({
        nodeViews: {}
      });
    }

    if (!editor.options.element.firstChild) {
      return;
    }

    const newElement = document.createElement("div");

    newElement.append(...editor.options.element.childNodes);
    editor.setOptions({
      element: newElement
    });
  });

  return (
    <>
      <div {...passedProps} ref={setEditorContentContainer} />
      <Portals renderers={props.editor.renderers()} />
    </>
  );
};

export { SolidEditorContent };
export type { SolidEditorContentProps };
