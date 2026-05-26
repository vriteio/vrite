import { Component, createComponent, createSignal, lazy, onMount, Show } from "solid-js";
import type { EditorProps } from "./client";
import "./styles.scss";

const ClientEditor = lazy(async () => ({
  default: (await import("./client")).ClientEditor
}));

const Editor: Component<EditorProps> = (props) => {
  const [mounted, setMounted] = createSignal(false);

  onMount(() => {
    setMounted(true);
  });

  return createComponent(Show, {
    get when() {
      return mounted();
    },
    get children() {
      return createComponent(ClientEditor, props);
    }
  });
};

export { Editor };
export type { EditorProps, EditorProvider, EditorProviderSetup } from "./client";
