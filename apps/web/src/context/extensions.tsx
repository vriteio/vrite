import { Accessor, createContext, createResource, ParentComponent, useContext } from "solid-js";
import { ExtensionGeneralContext, ExtensionSpec } from "@vrite/extensions";
import { SetStoreFunction } from "solid-js/store";
import { useClientContext } from "#context";
import { loadSandbox } from "#lib/extensions/sandbox";

interface ExtensionsContextData {
  installedExtensions: Accessor<ExtensionSpec[]>;
  availableExtensions: Accessor<ExtensionSpec[]>;
  callFunction: (
    spec: ExtensionSpec,
    name: string,
    ctx: {
      context: Omit<ExtensionGeneralContext, "client">;
      setContext: SetStoreFunction<Omit<ExtensionGeneralContext, "client">>;
    }
  ) => Promise<unknown>;
}

const officialExtensions = {
  dev: () => import("@vrite/extensions/dev.json")
};
const isOfficialExtension = (id: string): boolean => {
  return id in officialExtensions;
};
const ExtensionsContext = createContext<ExtensionsContextData>();
const ExtensionsContextProvider: ParentComponent = (props) => {
  const { client } = useClientContext();
  const [availableExtensions] = createResource(
    async () => {
      const installedExtensions = await client.extensions.list.query();
      const result = [];
      const extensions = Object.entries(officialExtensions);

      for await (const [extensionId, importExtension] of extensions) {
        if (
          !installedExtensions.find((installedExtension) => {
            return installedExtension.extensionId === extensionId;
          })
        ) {
          const module = await importExtension();

          result.push(module.default);
        }
      }

      return result;
    },
    { initialValue: [] }
  );
  const [installedExtensions] = createResource(
    async () => {
      const extensions = await client.extensions.list.query();
      const result = [];

      for await (const extension of extensions) {
        if (extension.externalUrl) {
          const response = await fetch(extension.externalUrl);

          if (response.ok) {
            const module = await response.json();

            result.push(module);
          }
        }

        result.push(
          await officialExtensions[extension.extensionId as keyof typeof officialExtensions]()
        );
      }

      return result;
    },
    { initialValue: [] }
  );
  const { callFunction } = loadSandbox();

  return (
    <ExtensionsContext.Provider
      value={{
        installedExtensions,
        availableExtensions,
        callFunction
      }}
    >
      {props.children}
    </ExtensionsContext.Provider>
  );
};
const useExtensionsContext = (): ExtensionsContextData => useContext(ExtensionsContext)!;

export { ExtensionsContextProvider, useExtensionsContext, isOfficialExtension };
