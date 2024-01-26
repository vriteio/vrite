import Sandbox from "@jetbrains/websandbox";
import {
  ExtensionBlockActionViewContext,
  ExtensionContentPieceViewContext,
  ExtensionConfigurationViewContext,
  ExtensionRuntimeSpec,
  ExtensionSpec,
  ExtensionBaseContext,
  ExtensionEnvironment,
  ContextObject,
  ExtensionElement
} from "@vrite/sdk/extensions";
import { createRef } from "#lib/utils";
import { useNotifications } from "#context";

interface ExtensionSandbox {
  spec: ExtensionSpec;
  runtimeSpec: ExtensionRuntimeSpec | null;
  destroy(): void;
  generateView<C>(
    id: string,
    envData: Record<string, ContextObject>,
    ctx: C
  ): Promise<ExtensionElement>;
  runFunction<
    C extends Omit<ExtensionBaseContext, "notify" | "client" | "flush"> = Omit<
      ExtensionBaseContext,
      "notify" | "client" | "flush"
    >
  >(
    id: string,
    envData: Record<string, ContextObject>,
    ctx: C
  ): Promise<void>;
}

const reconcileEnvData = (envData: Record<string, ContextObject>): void => {};
const loadExtensionSandbox = (spec: ExtensionSpec): ExtensionSandbox => {
  const { notify } = useNotifications();
  const [resolveRef, setResolveRef] = createRef(() => {});
  const sandbox = Sandbox.create(
    {
      hasLoaded() {
        const resolve = resolveRef();

        resolve?.();
      },
      notify,
      flush(env: ExtensionEnvironment) {
        // TODO: Update env
      }
    },
    { frameContainer: "#sandbox", allowAdditionalAttributes: "" }
  );
  const hasLoaded = new Promise<void>((resolve) => {
    setResolveRef(resolve);
  });

  let runtimeSpec: ExtensionRuntimeSpec | null = null;

  // Load sandbox
  sandbox.iframe.addEventListener("load", () => {
    sandbox.importScript("/sandbox.js");
  });
  // Load extension's runtime
  hasLoaded.then(async () => {
    runtimeSpec = await sandbox.connection?.remote.loadExtension(spec);
  });

  return {
    spec,
    get runtimeSpec() {
      return runtimeSpec;
    },
    destroy: () => sandbox.destroy(),
    generateView: async (id, envData, ctx) => {
      const result = await sandbox.connection?.remote.generateView(id, envData, ctx);

      if (result) {
        reconcileEnvData(result.envData);

        return result.view;
      }

      return null;
    },
    runFunction: async (id, envData, ctx) => {
      const result = await sandbox.connection?.remote.runFunction(id, envData, ctx);

      if (result) {
        reconcileEnvData(result.envData);
      }
    }
  };
};

export { loadExtensionSandbox };
export type { ExtensionSandbox };
