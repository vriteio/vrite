import {
  ContextObject,
  ContextValue,
  ExtensionSpec,
  ExtensionEnvironment,
  ExtensionMetadata,
  Extension,
  ExtensionBaseViewContext,
  ExtensionBaseContext,
  Val
} from "@vrite/sdk/extensions";

// eslint-disable-next-line init-declarations
declare const Websandbox: import("@jetbrains/websandbox").default;

(async () => {
  let extension: Extension | null = null;
  let env: ExtensionEnvironment | null = null;
  let metadata: ExtensionMetadata | null = null;

  const { createClient } = await import("@vrite/sdk");
  const client = createClient({
    token: "",
    extensionId: ""
  });
  const createDataScope = (name: string, defaultValue: ContextObject): void => {
    if (!env || !metadata) return;

    env.data[name] = {};
    Object.keys(defaultValue).forEach((key) => {
      env!.data[name]![key] = {
        [metadata!.__id]: key,
        [metadata!.__value]: defaultValue[key]
      } as Val<ContextValue>;
    });
  };
  const reconcileEnvData = (envData: Record<string, ContextObject>): void => {};
  const extractEnvData = (): Record<string, ContextObject> => {};

  Websandbox.connection?.setLocalApi({
    loadExtension: async (spec: ExtensionSpec) => {
      const module = await import(spec.runtime);

      extension = module.default || null;
      env = extension?.getEnvironment() || null;
      metadata = extension?.getMetadata() || null;

      return extension?.generateRuntimeSpec() || null;
    },
    generateView: async <C extends ExtensionBaseViewContext = ExtensionBaseViewContext>(
      id: string,
      envData: Record<string, ContextObject>,
      ctx: C
    ) => {
      reconcileEnvData(envData);

      const view = extension?.generateView<C>(id, {
        ...ctx,
        client,
        extensionId: "",
        config: {},
        useConfig: () => {
          return {};
        },
        flush: () => {
          return Websandbox.connection?.remote.flush(JSON.parse(JSON.stringify(context)));
        },
        notify: (message) => {
          return Websandbox.connection?.remote.notify(message);
        },
        token: ""
      });

      return {
        view,
        envData: extractEnvData()
      };
    },
    runFunction: async <C extends ExtensionBaseContext | never = never>(
      id: string,
      envData: Record<string, ContextObject>,
      ctx: C
    ) => {
      reconcileEnvData(envData);
      extension?.runFunction<C>(id, {
        ...ctx,
        client,
        extensionId: "",
        config: {},
        flush: () => {},
        notify: () => {},
        token: ""
      });

      return {
        envData: extractEnvData()
      };
    }
  });
  Websandbox.connection?.remote.hasLoaded();
})();
