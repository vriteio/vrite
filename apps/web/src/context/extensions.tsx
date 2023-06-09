import { Accessor, createContext, createResource, ParentComponent, useContext } from "solid-js";
import { ContextObject, ExtensionGeneralContext, ExtensionSpec } from "@vrite/extensions";
import { useClientContext } from "#context";
import { loadSandbox } from "#lib/extensions/sandbox";

interface ExtensionDetails {
  spec: ExtensionSpec;
  config?: ContextObject;
  token?: string;
  id?: string;
}
interface ExtensionsContextData {
  installedExtensions: Accessor<ExtensionDetails[]>;
  getAvailableExtensions: () => Promise<ExtensionDetails[]>;
  callFunction: (
    spec: ExtensionSpec,
    name: string,
    ctx: {
      extensionId: string;
      token: string;
      context: Accessor<
        Omit<ExtensionGeneralContext, "client" | "token" | "extensionId" | "notify">
      >;
    }
  ) => Promise<unknown>;
}

const officialExtensions = {
  "dev": () => import("@vrite/extensions/dev.json"),
  "hashnode": () => import("@vrite/extensions/hashnode.json"),
  "gpt-3.5": () => import("@vrite/extensions/gpt-3.5.json")
};
const isOfficialExtension = (id: string): boolean => {
  return id in officialExtensions;
};
const ExtensionsContext = createContext<ExtensionsContextData>();
const ExtensionsContextProvider: ParentComponent = (props) => {
  const { client } = useClientContext();
  const getAvailableExtensions = async (): Promise<ExtensionDetails[]> => {
    const installedExtensions = await client.extensions.list.query();
    const result = [];
    const extensions = Object.entries(officialExtensions);

    for await (const [name, importExtension] of extensions) {
      if (
        !installedExtensions.find((installedExtension) => {
          return installedExtension.name === name;
        })
      ) {
        const { default: spec } = await importExtension();

        result.push({ spec });
      }
    }

    return result;
  };
  const [installedExtensions, { mutate: setInstalledExtensions }] = createResource(
    async () => {
      const extensions = await client.extensions.list.query();
      const result = [];

      for await (const extension of extensions) {
        if (extension.externalUrl) {
          const response = await fetch(extension.externalUrl);

          if (response.ok) {
            const spec = await response.json();

            result.push({
              spec,
              id: extension.id,
              config: extension.config,
              token: extension.token
            });
          }
        } else {
          const spec = await officialExtensions[
            extension.name as keyof typeof officialExtensions
          ]();

          result.push({
            spec,
            id: extension.id,
            config: extension.config,
            token: extension.token
          });
        }
      }

      return result;
    },
    { initialValue: [] }
  );
  const { callFunction } = loadSandbox();

  client.extensions.changes.subscribe(undefined, {
    async onData({ action, data }) {
      if (action === "create") {
        const spec = await officialExtensions[data.name as keyof typeof officialExtensions]();

        setInstalledExtensions((extensions) => {
          return [...extensions, { config: data.config, id: data.id, token: data.token, spec }];
        });
      } else if (action === "update") {
        setInstalledExtensions((extensions) => {
          return extensions.map((extension) => {
            if (extension.id === data.id) {
              return { ...extension, ...data };
            }

            return extension;
          });
        });
      } else if (action === "delete") {
        setInstalledExtensions((extensions) => {
          return extensions.filter((extension) => {
            return extension.id !== data.id;
          });
        });
      }
    }
  });

  return (
    <ExtensionsContext.Provider
      value={{
        installedExtensions,
        getAvailableExtensions,
        callFunction
      }}
    >
      {props.children}
    </ExtensionsContext.Provider>
  );
};
const useExtensionsContext = (): ExtensionsContextData => useContext(ExtensionsContext)!;

export { ExtensionsContextProvider, ExtensionsContext, useExtensionsContext, isOfficialExtension };
export type { ExtensionDetails };
