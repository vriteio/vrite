import {
  createContext,
  createEffect,
  createResource,
  InitializedResource,
  on,
  ParentComponent,
  useContext
} from "solid-js";
import { ExtensionSpec, ContextObject } from "@vrite/sdk/extensions";
import { useClient, useHostConfig } from "#context";
import { ExtensionSandbox, loadExtensionSandbox } from "#lib/extensions";

interface ExtensionDetails {
  spec: ExtensionSpec;
  url: string;
  config?: ContextObject;
  token?: string;
  id?: string;
  sandbox?: ExtensionSandbox | null;
}
interface ExtensionsContextData {
  installedExtensions: InitializedResource<ExtensionDetails[]>;
  getAvailableExtensions: () => Promise<ExtensionDetails[]>;
  getExtensionSandbox: (name: string) => ExtensionSandbox | undefined;
}

const officialExtensions = [
  "https://raw.githubusercontent.com/vriteio/extensions/main/vrite/gpt-3.5/build/spec.json"
];
const getAbsoluteSpecPath = (url: string, specPath: string): string => {
  if (specPath.startsWith("http://") || specPath.startsWith("https://")) {
    return specPath;
  } else {
    const relativePathSegments = specPath.split("/");
    const baseDirectoryPath = url.split("/").slice(0, -1).join("/");

    let runtimeUrl = baseDirectoryPath;

    for (const segment of relativePathSegments) {
      if (segment === "..") {
        runtimeUrl = runtimeUrl.split("/").slice(0, -1).join("/");
      } else {
        runtimeUrl += `/${segment}`;
      }
    }

    return runtimeUrl;
  }
};
const processSpec = (url: string, spec: ExtensionSpec): ExtensionSpec => {
  return {
    ...spec,
    ...(spec.iconDark && { iconDark: getAbsoluteSpecPath(url, spec.iconDark || "") }),
    icon: getAbsoluteSpecPath(url, spec.icon || ""),
    runtime: getAbsoluteSpecPath(url, spec.runtime || "")
  };
};
const isOfficialExtension = (id: string): boolean => {
  return id in officialExtensions;
};
const ExtensionsContext = createContext<ExtensionsContextData>();
const ExtensionsProvider: ParentComponent = (props) => {
  const client = useClient();
  const hostConfig = useHostConfig();
  const extensionSandboxes = new Map<string, ExtensionSandbox>();
  const [installedExtensions, { mutate: setInstalledExtensions }] = createResource<
    ExtensionDetails[]
  >(
    async () => {
      if (!hostConfig.extensions) return [];

      const extensions = await client.extensions.list.query();
      const result: ExtensionDetails[] = [];

      for await (const extension of extensions) {
        const response = await fetch(extension.url);

        if (response.ok) {
          const spec = await response.json();

          result.push({
            url: extension.url,
            id: extension.id,
            // @ts-ignore
            config: extension.config,
            token: extension.token,
            spec: processSpec(extension.url, spec),
            get sandbox() {
              return extensionSandboxes.get(spec.name) || null;
            }
          });
        }
      }

      return result;
    },
    { initialValue: [] }
  );
  const getAvailableExtensions = async (): Promise<ExtensionDetails[]> => {
    if (!hostConfig.extensions) return [];

    const installed = installedExtensions();
    const result: ExtensionDetails[] = [];

    for await (const url of officialExtensions) {
      const isInstalled = installed.find((extension) => {
        return extension.url === url;
      });

      if (isInstalled) {
        continue;
      }

      const response = await fetch(url);

      if (response.ok) {
        const spec = await response.json();

        result.push({
          url,
          spec: processSpec(url, spec),
          get sandbox() {
            return extensionSandboxes.get(spec.name) || null;
          }
        });
      }
    }

    return result;
  };

  if (hostConfig.extensions) {
    client.extensions.changes.subscribe(undefined, {
      async onData({ action, data }) {
        if (action === "create") {
          try {
            const response = await fetch(data.url);
            const spec = await response.json();

            setInstalledExtensions((extensions) => {
              return [
                ...extensions,
                { config: data.config, id: data.id, token: data.token, url: data.url, spec }
              ];
            });
          } catch (e) {
            // TODO: Handle error
          }
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
  }

  createEffect(
    on(installedExtensions, (installedExtensions) => {
      const existingSandboxes = [...extensionSandboxes.keys()];

      installedExtensions.forEach((extension) => {
        if (existingSandboxes.includes(extension.spec.name)) {
          existingSandboxes.splice(existingSandboxes.indexOf(extension.spec.name), 1);
        } else {
          extensionSandboxes.set(
            extension.spec.name,
            loadExtensionSandbox(extension.url, extension.spec)
          );
        }
      });
      existingSandboxes.forEach((id) => {
        extensionSandboxes.get(id)?.destroy();
        extensionSandboxes.delete(id);
      });
    })
  );

  return (
    <ExtensionsContext.Provider
      value={{
        installedExtensions,
        getAvailableExtensions,
        getExtensionSandbox: (id: string) => extensionSandboxes.get(id)
      }}
    >
      {props.children}
    </ExtensionsContext.Provider>
  );
};
const useExtensions = (): ExtensionsContextData => useContext(ExtensionsContext)!;

export { ExtensionsProvider, ExtensionsContext, useExtensions, isOfficialExtension };
export type { ExtensionDetails };
