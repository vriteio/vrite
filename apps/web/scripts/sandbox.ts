import {
  ContextValue,
  ExtensionSpec,
  ExtensionEnvironment,
  ExtensionMetadata,
  Extension,
  ExtensionBaseViewContext,
  ExtensionBaseContext,
  Val,
  generateId,
  isVal
} from "@vrite/sdk/extensions";

// eslint-disable-next-line init-declarations
declare const Websandbox: import("@jetbrains/websandbox").default;

type KeysOfType<T, V> = { [K in keyof T]-?: T[K] extends V ? K : never }[keyof T];
type SerializedEnvData = Record<string, ContextValue>;
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

(async () => {
  let extension: Extension | null = null;
  let env: ExtensionEnvironment | null = null;
  let metadata: ExtensionMetadata | null = null;
  let extensionId = "";
  let token = "";
  let spec: ExtensionSpec | null = null;

  const { createClient } = await import("@vrite/sdk/api");
  const client = createClient({
    ...(location.ancestorOrigins.item(0)?.includes("//localhost") && {
      baseURL: "http://localhost:4444"
    }),
    token,
    extensionId
  });
  const wrapInVal = (value: ContextValue, path: string, previousVal?: Val): Val => {
    const output = (() => output[metadata!.__value]) as Val;

    output[metadata!.__id] = `${path}`;

    if (typeof value === "object" && !Array.isArray(value) && value !== null) {
      output[metadata!.__value] = Object.fromEntries(
        Object.keys(value).map((key) => {
          return [key, wrapInVal(value[key], path ? `${path}.${key}` : key)];
        })
      );
    } else {
      output[metadata!.__value] = value;
    }

    return output;
  };
  const unwrapVal = (value: Val): ContextValue => {
    if (!isVal(value as Val<ContextValue>) && typeof value !== "function") {
      return value as unknown as ContextValue;
    }

    const output = value();

    if (typeof output === "object" && !Array.isArray(output) && output !== null) {
      return Object.fromEntries(
        Object.keys(output).map((key) => {
          return [key, unwrapVal(output[key] as Val<ContextValue>)];
        })
      );
    }

    return output;
  };
  const updateEnvData = (serializedEnvData: SerializedEnvData): void => {
    if (!env) return;

    env.data = {};
    Object.keys(serializedEnvData).forEach((key) => {
      env!.data[key] = wrapInVal(serializedEnvData[key], key, env!.data[key]);
    });
  };
  const serializeEnvData = (): SerializedEnvData => {
    const output: Record<string, ContextValue> = {};

    Object.keys(env!.data).forEach((key) => {
      output[key] = unwrapVal(env!.data[key]);
    });

    return output;
  };
  const createExtensionContext = <C extends ExtensionBaseContext = ExtensionBaseContext>(
    ctx: SerializedContext<C>,
    scopeId: string,
    options?: { addCSSString?(css: string): void }
  ): C => {
    return new Proxy(
      {},
      {
        get(_, key) {
          if (key === "client") return client;
          if (key === "token") return token;
          if (key === "extensionId") return extensionId;
          if (key === "spec") return spec;

          if (
            ctx.contextFunctions.includes(key as SerializedContext<C>["contextFunctions"][number])
          ) {
            return (...args: any[]) => {
              return Websandbox.connection?.remote.runFunction(scopeId, key as string, ...args);
            };
          }

          if (key === "flush") {
            return () => {
              return Websandbox.connection?.remote.flush(serializeEnvData());
            };
          }

          if (key === "css") {
            return (strings: TemplateStringsArray) => {
              if (options?.addCSSString) {
                options.addCSSString(strings.join(" "));
              }

              return strings.join(" ");
            };
          }

          if (key === "use") {
            return (inputPath: string) => {
              const path = `${scopeId.split(":")[1] || ""}.${inputPath}`;
              const parts = path.split(".");
              const getVal = (): Val => {
                return parts.slice(1).reduce((currentVal, part, index) => {
                  const value = currentVal();

                  if (typeof value !== "object" || Array.isArray(value) || value === null) {
                    throw new Error(`Cannot use ${path} in this context`);
                  }

                  let output = (value as { [K: string]: Val })[part];

                  if (typeof output === "undefined") {
                    value[part] = wrapInVal(undefined, parts.slice(0, index + 2).join("."));
                    output = value[part] as Val;
                  }

                  return output;
                }, env!.data[parts[0]]);
              };
              const getter = (() => {
                return unwrapVal(getVal());
              }) as Val;

              Object.defineProperty(getter, metadata!.__value, {
                get() {
                  return unwrapVal(getVal());
                }
              });
              Object.defineProperty(getter, metadata!.__id, { value: path });

              if (ctx.usableEnv.readable.includes(parts[1])) {
                return getter;
              } else if (ctx.usableEnv.writable.includes(parts[1])) {
                const setter = (value: any): void => {
                  getVal()[metadata!.__value] = wrapInVal(value, path)[metadata!.__value];
                  extension?.triggerEffects(getVal()[metadata!.__id]);
                };

                return [getter, setter];
              }

              throw new Error(`Cannot use ${path} in this context`);
            };
          }

          return ctx[key as keyof SerializedContext<C>];
        }
      }
    ) as C;
  };

  Websandbox.connection?.setLocalApi({
    loadExtension: async (extensionDetails: {
      token: string;
      extensionId: string;
      spec: ExtensionSpec;
    }) => {
      const runtime = await fetch(extensionDetails.spec.runtime);
      const func = await runtime.text();
      const url = URL.createObjectURL(new Blob([func], { type: "text/javascript" }));
      // import() has to include backtick (`${url}`) to be ignored by Vite
      // eslint-disable-next-line no-inline-comments
      const module = await import(/* @vite-ignore */ `${url}`);

      URL.revokeObjectURL(url);
      extension = module.default || null;
      env = extension?.getEnvironment() || null;
      metadata = extension?.getMetadata() || null;
      token = extensionDetails.token!;
      extensionId = extensionDetails.extensionId!;
      spec = extensionDetails.spec!;
      client.reconfigure({ token, extensionId });

      return extension?.generateRuntimeSpec() || null;
    },
    generateView: async <C extends ExtensionBaseViewContext = ExtensionBaseViewContext>(
      id: string,
      envData: SerializedEnvData,
      serializedContext: SerializedContext<C>,
      uid = generateId()
    ) => {
      updateEnvData(envData);

      let css = "";

      const view = await extension?.generateView<C>(
        id,
        createExtensionContext<C>(serializedContext, `view:${uid}`, {
          addCSSString(cssString) {
            css = `${css} ${cssString}`.trim();
          }
        }),
        uid
      );

      return {
        view,
        css,
        envData: serializeEnvData()
      };
    },
    runFunction: async <C extends ExtensionBaseContext | never = never>(
      id: string,
      envData: SerializedEnvData,
      serializedContext: SerializedContext<C>,
      uid = generateId()
    ) => {
      updateEnvData(envData);
      await extension?.runFunction<C>(
        id,
        createExtensionContext<C>(serializedContext, `func:${uid}`),
        uid
      );

      return {
        envData: serializeEnvData()
      };
    },
    updateEnvData: async (updatedIds: string[], envData: SerializedEnvData) => {
      updateEnvData(envData);

      if (updatedIds.length && extension && "triggerEffects" in extension) {
        await extension.triggerEffects(...updatedIds);
        Websandbox.connection?.remote.flush(serializeEnvData());
      }

      return {
        envData: serializeEnvData()
      };
    },
    removeScope: (id: string) => {
      extension?.removeScope(id);

      return {
        envData: serializeEnvData()
      };
    }
  });
  Websandbox.connection?.remote.hasLoaded();
})();
