import { HocuspocusProvider, HocuspocusProviderWebsocket } from "@hocuspocus/provider";
import { type Accessor, createEffect, createSignal, onCleanup, untrack } from "solid-js";
import type { EditorCleanup, EditorProvider, EditorProviderSetup } from "./client-types";

interface ProviderLifecycleInput {
  url: Accessor<string | undefined>;
  doc: Accessor<string | undefined>;
  enabled: Accessor<boolean>;
  attempt: Accessor<number | undefined>;
  beforeAttach: Accessor<EditorProviderSetup | undefined>;
  onProvider: Accessor<((provider: EditorProvider) => EditorCleanup) | undefined>;
  onError: Accessor<((error: unknown, provider: EditorProvider) => void) | undefined>;
  notify?(type: "success" | "error", text: string): void;
}

const useEditorProvider = (input: ProviderLifecycleInput) => {
  const [provider, setProvider] = createSignal<EditorProvider | null>(null);

  createEffect(() => {
    const url = input.url();
    const doc = input.doc();

    if (!input.enabled() || !url || !doc) {
      setProvider(null);
      return;
    }

    const socket = new HocuspocusProviderWebsocket({ url });
    const next = new HocuspocusProvider({
      websocketProvider: socket,
      name: doc,
      url
    });
    void input.attempt();
    let disposed = false;
    let destroyed = false;
    let attachCleanup: EditorCleanup;
    let providerCleanup: EditorCleanup;
    let revealed = false;
    let authenticated = false;
    let synced = false;
    const reveal = () => {
      if (!disposed && !revealed) {
        revealed = true;
        setProvider(next);
      }
    };
    const revealRemote = () => authenticated && synced && reveal();
    const onAuthenticated = () => {
      authenticated = true;
      revealRemote();
    };
    const onSynced = (event: { state: boolean }) => {
      synced = event.state;
      revealRemote();
    };
    const destroy = () => {
      if (destroyed) return;
      destroyed = true;
      providerCleanup?.();
      attachCleanup?.();
      next.off("authenticated", onAuthenticated);
      next.off("synced", onSynced);
      next.destroy();
      socket.destroy();
    };

    next.on("authenticated", onAuthenticated);
    next.on("synced", onSynced);
    void (async () => {
      try {
        const setup = input.beforeAttach();
        const result = setup ? await untrack(() => setup(next)) : { renderImmediately: true };
        attachCleanup = result.cleanup;
        if (disposed) return attachCleanup?.();
        providerCleanup = untrack(() => input.onProvider()?.(next));
        if (result.renderImmediately) reveal();
        next.attach();
      } catch (error) {
        const onError = input.onError();
        untrack(() => onError?.(error, next));
        if (!onError) input.notify?.("error", "Failed to prepare editor data.");
        destroy();
      }
      if (disposed) destroy();
    })();

    onCleanup(() => {
      disposed = true;
      setProvider((current) => (current === next ? null : current));
      destroy();
    });
  });

  return provider;
};

export { useEditorProvider };
