import Sandbox from "@jetbrains/websandbox";
import { SetStoreFunction, unwrap } from "solid-js/store";
import { ExtensionGeneralContext, ExtensionSpec } from "@vrite/extensions";
import { createRef } from "#lib/utils";
import { useNotificationsContext } from "#context";

interface ExtensionsSandbox {
  callFunction(
    spec: ExtensionSpec,
    func: string,
    ctx: {
      extensionId: string;
      token: string;
      context: Omit<ExtensionGeneralContext, "client" | "token" | "extensionId" | "notify">;
      setContext?: SetStoreFunction<
        Omit<ExtensionGeneralContext, "client" | "token" | "extensionId" | "notify">
      >;
    }
  ): Promise<unknown>;
}

const loadSandbox = (): ExtensionsSandbox => {
  const { notify } = useNotificationsContext();
  const [resolveRef, setResolveRef] = createRef(() => {});
  const [contextRef, setContextRef] = createRef<{
    value: Omit<ExtensionGeneralContext, "client" | "token" | "extensionId" | "notify">;
    setter?: SetStoreFunction<
      Omit<ExtensionGeneralContext, "client" | "token" | "extensionId" | "notify">
    >;
  } | null>(null);
  const sandbox = Sandbox.create(
    {
      hasLoaded() {
        const resolve = resolveRef();

        resolve?.();
      },
      notify,
      remoteFunction(
        functionName: keyof Omit<
          ExtensionGeneralContext,
          "client" | "token" | "extensionId" | "notify"
        >,
        ...args: any[]
      ) {
        const func = contextRef()?.value[functionName] as unknown;

        if (typeof func === "function") {
          func?.(...args);
        }
      },
      forceUpdate(
        data: Omit<ExtensionGeneralContext, "client" | "token" | "extensionId" | "notify">
      ) {
        contextRef()?.setter?.(data);
      }
    },
    { frameContainer: "#sandbox" }
  );

  let hasLoaded = new Promise<void>((resolve) => {
    setResolveRef(resolve);
  });

  sandbox.iframe.addEventListener("load", () => {
    // eslint-disable-next-line func-names
    sandbox.importScript("/sandbox.js");
  });

  const reload = async (): Promise<void> => {
    hasLoaded = new Promise<void>((resolve) => {
      setResolveRef(resolve);
    });
    await sandbox.connection?.remote.reload();

    return hasLoaded;
  };

  return {
    callFunction: async (spec, funcName, { context, setContext, token, extensionId }) => {
      setContextRef({
        value: context,
        setter: setContext
      });

      const func = spec.functions[funcName];
      const updatedContext = await sandbox.connection?.remote.callFunction(
        func,
        JSON.parse(JSON.stringify(unwrap(context))),
        {
          extensionId,
          token
        }
      );

      Object.keys(updatedContext).forEach((key) => {
        const value = updatedContext[key];
        const setter = context[
          `set${key[0].toUpperCase()}${key.slice(1)}` as keyof typeof context
        ] as unknown;

        if (key === "spec") return;

        if (setter && typeof setter === "function") {
          setter(value);
        }
      });
    }
  };
};

export { loadSandbox };
export type { ExtensionsSandbox };
