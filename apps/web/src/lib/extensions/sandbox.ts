import Sandbox from "@jetbrains/websandbox";
import { SetStoreFunction, unwrap } from "solid-js/store";
import {
  ContextObject,
  ContextValue,
  ExtensionGeneralContext,
  ExtensionSpec
} from "@vrite/extensions";
import { createRef } from "#lib/utils";
import { isOfficialExtension, useNotificationsContext } from "#context";

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
  const [setContextRef, setSetContextRef] = createRef<
    SetStoreFunction<Omit<ExtensionGeneralContext, "client" | "token" | "extensionId" | "notify">>
  >(() => {});
  const sandbox = Sandbox.create(
    {
      hasLoaded() {
        const resolve = resolveRef();

        resolve?.();
      },
      notify,
      forceUpdate(
        data: Omit<ExtensionGeneralContext, "client" | "token" | "extensionId" | "notify">
      ) {
        setContextRef()(data);
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
      setSetContextRef(setContext || (() => {}));

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

      if (!isOfficialExtension(spec.name)) {
        await reload();
      }
    }
  };
};

export { loadSandbox };
export type { ExtensionsSandbox };
