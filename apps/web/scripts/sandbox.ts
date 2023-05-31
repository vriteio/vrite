import { ContextObject, ContextValue } from "@vrite/extensions";

// eslint-disable-next-line init-declarations
declare const Websandbox: import("@jetbrains/websandbox").default;

(async () => {
  const { createClient } = await import("@vrite/sdk");
  const client = createClient({
    token: "",
    extensionId: ""
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
        extensionId: meta.extensionId
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
})();
