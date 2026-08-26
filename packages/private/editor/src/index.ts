import { type Component, createComponent, createSignal, lazy, onMount, Show } from "solid-js";
import type { EditorProps } from "./client-types";
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
    keyed: true,
    get children() {
      return createComponent(ClientEditor, props);
    }
  });
};

export { Editor };
export type {
  EditorDiff,
  EditorDiffChange,
  EditorProps,
  EditorProvider,
  EditorProviderSetup,
  EditorProviderSetupResult,
  MergedVersionDiff,
  VersionComparison
} from "./client-types";
export { createVersionComparison } from "./extensions/version-diff";
