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
// eslint-disable-next-line init-declarations
declare const Websandbox: import("@jetbrains/websandbox").default;

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
    sandbox.run(async function sandbox() {
      const { createClient } = await import("@vrite/sdk");
      const client = createClient({
        token: ""
      });
      const context: Record<string, ContextObject> = {};
      const createSetterMethod = (contextKey: string) => {
        return (keyOrPartial: string | ContextObject, value?: ContextValue) => {
          context[contextKey] = context[contextKey] || {};

          if (typeof keyOrPartial === "string" && typeof value !== "undefined") {
            context[contextKey][keyOrPartial] = value;

            if (keyOrPartial.startsWith("$")) {
              Websandbox.connection?.remote.forceUpdate(JSON.parse(JSON.stringify(context)));
            }
          } else {
            Object.assign(context[contextKey], keyOrPartial);

            const dynamic = Object.keys(keyOrPartial).some((key) => key.startsWith("$"));

            if (dynamic) {
              Websandbox.connection?.remote.forceUpdate(JSON.parse(JSON.stringify(context)));
            }
          }
        };
      };
      const contextMethods = {
        setConfig: createSetterMethod("config"),
        setTemp: createSetterMethod("temp"),
        setData: createSetterMethod("data")
      };
      const buildContext = ({ methods, ...inputContext }: ContextObject): void => {
        Object.assign(context, {
          ...inputContext,
          ...(methods &&
            Object.fromEntries(
              (methods as Array<keyof typeof contextMethods>).map((method) => [
                method,
                contextMethods[method]
              ])
            ))
        });
      };

      Websandbox.connection?.setLocalApi({
        reload: () => {
          window.location.reload();
        },
        callFunction: async (
          func: string,
          inputContext: ContextObject,
          meta: { token: string; extensionId: string }
        ) => {
          client.reconfigure({
            token: meta.token,
            headers: {
              "x-vrite-extension-id": meta.extensionId
            }
          });
          buildContext(inputContext);

          const url = URL.createObjectURL(new Blob([func], { type: "text/javascript" }));
          // import() has to include backtick (`${url}`) to be ignored by Vite
          // eslint-disable-next-line no-inline-comments
          const module = await import(/* @vite-ignore */ `${url}`);

          URL.revokeObjectURL(url);
          await module.default({
            ...context,
            client,
            token: meta.token,
            extensionId: meta.extensionId,
            notify: Websandbox.connection?.remote.notify,
            forceUpdate: () => {
              return Websandbox.connection?.remote.forceUpdate(JSON.parse(JSON.stringify(context)));
            }
          });

          return JSON.parse(JSON.stringify(context));
        }
      });
      Websandbox.connection?.remote.hasLoaded();
    });
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
