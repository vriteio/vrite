import Sandbox from "@jetbrains/websandbox";
import {
  ExtensionRuntimeSpec,
  ExtensionSpec,
  ExtensionBaseContext,
  ContextObject,
  ExtensionElement,
  ExtensionBaseViewContext,
  ExtensionMetadata
} from "@vrite/sdk/extensions";
import { Accessor, Setter, createSignal } from "solid-js";
import { createRef } from "#lib/utils";

type KeysOfType<T, V> = { [K in keyof T]-?: T[K] extends V ? K : never }[keyof T];
type SerializedContext<C extends ExtensionBaseContext> = Omit<
  C,
  | "client"
  | "token"
  | "extensionId"
  | "spec"
  | ExtensionMetadata["__usableEnv"]
  | KeysOfType<C, Function>
> & {
  usableEnv: C[ExtensionMetadata["__usableEnv"]] extends never
    ? never
    : {
        readable: Array<keyof C[ExtensionMetadata["__usableEnv"]]["readable"]>;
        writable: Array<keyof C[ExtensionMetadata["__usableEnv"]]["writable"]>;
      };
  contextFunctions: KeysOfType<Omit<C, "use" | "flush">, Function>[];
};
type ContextFunctions<C extends ExtensionBaseContext> = {
  [K in KeysOfType<Omit<C, "use" | "flush">, Function>]: C[K] extends (...args: infer A) => infer R
    ? (...args: A) => R | Awaited<R>
    : never;
};
type UsableEnvData<C extends ExtensionBaseContext> = {
  [K in Exclude<
    | keyof C[ExtensionMetadata["__usableEnv"]]["readable"]
    | keyof C[ExtensionMetadata["__usableEnv"]]["writable"],
    ExtensionMetadata["__value"]
  >]: K extends keyof C[ExtensionMetadata["__usableEnv"]]["readable"]
    ? C[ExtensionMetadata["__usableEnv"]]["readable"][K]
    : C[ExtensionMetadata["__usableEnv"]]["writable"][K];
};

interface ExtensionSandbox {
  spec: ExtensionSpec & ExtensionRuntimeSpec;
  envData: Accessor<ContextObject>;
  setEnvData: Setter<ContextObject>;
  destroy(): void;
  generateView<C extends ExtensionBaseViewContext>(
    id: string,
    ctx: SerializedContext<C>,
    func: ContextFunctions<C>
  ): Promise<ExtensionElement>;
  runFunction<C extends ExtensionBaseContext>(
    id: string,
    ctx: SerializedContext<C>,
    func: ContextFunctions<C>
  ): Promise<void>;
  removeScope(id: string): Promise<void>;
}
interface ExtensionDetails {
  spec: ExtensionSpec;
  url: string;
  config?: ContextObject;
  token?: string;
  id?: string;
  sandbox?: ExtensionSandbox | null;
}

const loadExtensionSandbox = async (
  extensionDetails: Required<Pick<ExtensionDetails, "spec" | "token" | "id">>
): Promise<ExtensionSandbox> => {
  const [resolveRef, setResolveRef] = createRef(() => {});
  const [envData, setEnvData] = createSignal<ContextObject>({});
  const scopes = new Map<string, { func: Record<string, (...args: any[]) => void> }>();
  const sandbox = Sandbox.create(
    {
      hasLoaded() {
        const resolve = resolveRef();

        resolve?.();
      },
      flush(envData: Record<string, ContextObject>) {
        setEnvData(envData);
      },
      runFunction(contextId: string, name: string, ...args: any[]) {
        const func = scopes.get(contextId)?.func || {};

        return func[name as keyof typeof func](...args);
      }
    },
    { frameContainer: "#sandbox", allowAdditionalAttributes: "" }
  );
  const hasLoaded = new Promise<void>((resolve) => {
    setResolveRef(resolve);
  });

  // Load sandbox
  sandbox.iframe.addEventListener("load", () => {
    sandbox.importScript("/sandbox.js");
  });
  // Load extension's runtime
  await hasLoaded;

  const runtimeSpec: ExtensionRuntimeSpec = await sandbox.connection?.remote.loadExtension({
    token: extensionDetails.token || "",
    extensionId: extensionDetails.id || "",
    spec: extensionDetails.spec
  });

  return {
    spec: {
      ...extensionDetails.spec,
      ...runtimeSpec
    },
    envData,
    setEnvData,
    destroy: () => sandbox.destroy(),
    generateView: async <C extends ExtensionBaseViewContext>(
      id: string,
      ctx: SerializedContext<C>,
      func: ContextFunctions<C>
    ) => {
      scopes.set(`view:${id}`, {
        func: func as Record<string, (...args: any[]) => void>
      });

      const result = await sandbox.connection?.remote.generateView(
        id,
        JSON.parse(JSON.stringify(envData())),
        JSON.parse(JSON.stringify(ctx))
      );

      if (result) {
        setEnvData(result.envData);

        return result.view;
      }

      return null;
    },
    runFunction: async <C extends ExtensionBaseContext>(
      id: string,
      ctx: SerializedContext<C>,
      func: ContextFunctions<C>
    ) => {
      scopes.set(`func:${id}`, {
        func: func as Record<string, (...args: any[]) => void>
      });

      const result = await sandbox.connection?.remote.runFunction(
        id,
        JSON.parse(JSON.stringify(envData())),
        JSON.parse(JSON.stringify(ctx))
      );

      scopes.delete(`func:${id}`);

      if (result) {
        setEnvData(result.envData);
      }
    },
    removeScope: async (id) => {
      const result = await sandbox.connection?.remote.removeScope(id);

      scopes.delete(`view:${id}`);

      if (result) {
        setEnvData(result.envData);
      }
    }
  };
};

export { loadExtensionSandbox };
export type {
  ExtensionSandbox,
  ExtensionDetails,
  SerializedContext,
  ContextFunctions,
  UsableEnvData
};
