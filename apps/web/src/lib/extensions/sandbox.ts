import Sandbox from "@jetbrains/websandbox";
import { SetStoreFunction } from "solid-js/store";
import { ExtensionGeneralContext, ExtensionSpec } from "@vrite/extensions";
import { createRef } from "#lib/utils";
import { useNotificationsContext } from "#context";
import { Accessor } from "solid-js";

interface ExtensionsSandbox {
  callFunction(
    spec: ExtensionSpec,
    func: string,
    ctx: {
      extensionId: string;
      token: string;
      context: Accessor<
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
    setter?: (
      data: Omit<ExtensionGeneralContext, "client" | "token" | "extensionId" | "notify">
    ) => void;
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
    callFunction: async (spec, funcName, { context, token, extensionId }) => {
      setContextRef({
        value: context(),
        setter: (data) => {
          Object.keys(data).forEach((key) => {
            const value =
              data[
                key as keyof Omit<
                  ExtensionGeneralContext,
                  "client" | "token" | "extensionId" | "notify"
                >
              ];
            const setter = context()[
              `set${key[0].toUpperCase()}${key.slice(1)}` as keyof Omit<
                ExtensionGeneralContext,
                "client" | "token" | "extensionId" | "notify"
              >
            ] as unknown;

            if (key === "spec") return;

            if (setter && typeof setter === "function") {
              setter(value);
            }
          });
        }
      });

      const func = spec.functions[funcName];
      const updatedContext = await sandbox.connection?.remote.callFunction(
        func,
        JSON.parse(JSON.stringify(context())),
        {
          extensionId,
          token
        }
      );

      contextRef()?.setter?.(updatedContext);
    }
  };
};

export { loadSandbox };
export type { ExtensionsSandbox };
