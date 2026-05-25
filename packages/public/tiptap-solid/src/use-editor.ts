import { SolidEditor } from "./editor";
import { createSignal, onCleanup } from "solid-js";
import { EditorOptions } from "@tiptap/core";

const useForceUpdate = (): (() => void) => {
  const [, setValue] = createSignal(0);

  return () => setValue((value) => value + 1);
};
const useEditor = (options: Partial<EditorOptions> = {}): (() => SolidEditor) => {
  const [getEditor] = createSignal(new SolidEditor(options));
  const forceUpdate = useForceUpdate();

  getEditor().on("transaction", forceUpdate);
  onCleanup(() => {
    getEditor().destroy();
  });

  return getEditor;
};

export { useEditor };
