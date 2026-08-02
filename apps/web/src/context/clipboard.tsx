import { createContext, createSignal, ParentComponent, useContext } from "solid-js";

import { CopyFallbackDialog } from "#web/pages/workspace/settings/copy-fallback-dialog";
import { useNotify } from "./notifications";

interface CopyFallbackOptions {
  description?: string;
  title?: string;
}
interface CopyTextOptions {
  error?: false | string;
  fallback?: false | CopyFallbackOptions;
  html?: string;
  success?: false | string;
}
interface ClipboardContextData {
  copyText(value: string, options?: CopyTextOptions): Promise<boolean>;
}
interface CopyFallbackState extends CopyFallbackOptions {
  value: string;
}

const ClipboardContext = createContext<ClipboardContextData>();
const ClipboardProvider: ParentComponent = (props) => {
  const notify = useNotify();
  const [fallback, setFallback] = createSignal<CopyFallbackState | null>(null);
  const copyText: ClipboardContextData["copyText"] = async (value, options = {}) => {
    try {
      if (options.html && typeof ClipboardItem !== "undefined") {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              "text/html": new Blob([options.html], { type: "text/html" }),
              "text/plain": new Blob([value], { type: "text/plain" })
            })
          ]);
        } catch {
          await navigator.clipboard.writeText(value);
        }
      } else {
        await navigator.clipboard.writeText(value);
      }

      if (options.success !== false) {
        notify({ type: "success", text: options.success || "Copied to clipboard" });
      }

      return true;
    } catch (error) {
      console.error(error);

      if (options.fallback !== false) {
        setFallback({
          ...(options.fallback || {}),
          value
        });
      }
      if (options.error !== false) {
        notify({
          type: "error",
          text: options.error || "Clipboard access failed. Copy the value manually."
        });
      }

      return false;
    }
  };

  return (
    <ClipboardContext.Provider value={{ copyText }}>
      {props.children}
      <CopyFallbackDialog
        opened={Boolean(fallback())}
        value={fallback()?.value || ""}
        title={fallback()?.title}
        description={fallback()?.description}
        onClose={() => setFallback(null)}
      />
    </ClipboardContext.Provider>
  );
};
const useClipboard = (): ClipboardContextData => {
  return useContext(ClipboardContext) ?? { copyText: async () => false };
};

export { ClipboardProvider, useClipboard };
export type { CopyFallbackOptions, CopyTextOptions };
