import {
  Accessor,
  createContext,
  createEffect,
  createSignal,
  on,
  ParentComponent,
  useContext
} from "solid-js";
import { ExtensionSpec } from "@vrite/sdk/extensions";
import {
  App,
  useAuthenticatedUserData,
  useClient,
  useHostConfig,
  useNotifications
} from "#context";
import { ExtensionDetails, ExtensionSandbox, loadExtensionSandbox } from "#lib/extensions";

interface ExtensionsContextData {
  installedExtensions: Accessor<ExtensionDetails[]>;
  availableExtensions: Accessor<ExtensionDetails[]>;
  loadingInstalledExtensions: Accessor<boolean>;
  loadingAvailableExtensions: Accessor<boolean>;
  installExtension: (
    extensionDetails: ExtensionDetails,
    overwrite?: boolean
  ) => Promise<ExtensionDetails>;
  uninstallExtension: (extensionDetails: ExtensionDetails) => Promise<void>;
}

const officialExtensions = [
  "https://raw.githubusercontent.com/vriteio/extensions/main/vrite/gpt-3.5/build/spec.json",
  "https://raw.githubusercontent.com/vriteio/extensions/main/vrite/mdx-transformer/build/spec.json",
  "https://raw.githubusercontent.com/vriteio/extensions/main/vrite/publish-dev/build/spec.json",
  "https://raw.githubusercontent.com/vriteio/extensions/main/vrite/publish-medium/build/spec.json",
  "https://raw.githubusercontent.com/vriteio/extensions/main/vrite/publish-hashnode/build/spec.json"
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
  const { notify } = useNotifications();
  const { profile } = useAuthenticatedUserData();
  const extensionSandboxes = new Map<string, ExtensionSandbox>();
  const [installedExtensions, setInstalledExtensions] = createSignal<ExtensionDetails[]>([]);
  const [availableExtensions, setAvailableExtensions] = createSignal<ExtensionDetails[]>([]);
  const [loadingInstalledExtensions, setLoadingInstalledExtensions] = createSignal(true);
  const [loadingAvailableExtensions, setLoadingAvailableExtensions] = createSignal(true);

  createEffect(async () => {
    if (!hostConfig.extensions) return;

    const extensions = await client.extensions.list.query();
    const result: ExtensionDetails[] = [];

    for await (const extension of extensions) {
      try {
        const response = await fetch(extension.url);

        if (response.ok) {
          const spec = await response.json();
          const extensionDetails = {
            url: extension.url,
            id: extension.id,
            // @ts-ignore
            config: extension.config,
            token: extension.token,
            spec: processSpec(extension.url, spec),
            get sandbox() {
              return extensionSandboxes.get(spec.name) || null;
            }
          };

          extensionSandboxes.set(spec.name, await loadExtensionSandbox(extensionDetails, client));
          result.push(extensionDetails);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    }

    setLoadingInstalledExtensions(false);
    setInstalledExtensions(result);
  });
  createEffect(
    on(installedExtensions, async () => {
      if (!hostConfig.extensions) return;

      const installed = installedExtensions();
      const available = availableExtensions();
      const result: ExtensionDetails[] = [];

      for await (const url of officialExtensions) {
        const installedExtension = installed.find((extension) => {
          return extension.url === url;
        });
        const availableExtension = available.find((extension) => {
          return extension.url === url;
        });

        if (installedExtension) {
          continue;
        }

        if (availableExtension) {
          result.push(availableExtension);
          continue;
        }

        try {
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
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
        }
      }

      setLoadingAvailableExtensions(false);
      setAvailableExtensions(result);
    })
  );

  const installExtension = async (
    extensionDetails: ExtensionDetails,
    overwrite = false
  ): Promise<ExtensionDetails> => {
    const spec = processSpec(extensionDetails.url, extensionDetails.spec);
    const { id, token } = await client.extensions.install.mutate({
      extension: {
        name: spec.name,
        displayName: spec.displayName,
        permissions: (spec.permissions || []) as App.TokenPermission[],
        url: extensionDetails.url
      },
      overwrite
    });
    const sandbox = await loadExtensionSandbox(
      {
        id,
        token,
        spec
      },
      client
    );
    const onConfigureCallback = sandbox.spec.onConfigure;

    extensionSandboxes.set(spec.name, sandbox);

    if (onConfigureCallback) {
      try {
        await sandbox.runFunction(
          onConfigureCallback,
          {
            contextFunctions: ["notify"],
            usableEnv: { readable: [], writable: [] },
            config: {}
          },
          { notify }
        );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
      }
    }

    const fullExtensionDetails = {
      ...extensionDetails,
      id,
      token,
      // @ts-ignore
      config: {},
      spec,
      get sandbox() {
        return extensionSandboxes.get(spec.name) || null;
      }
    };

    setInstalledExtensions((extensions) => {
      return [fullExtensionDetails, ...extensions];
    });

    return fullExtensionDetails;
  };
  const uninstallExtension = async (extensionDetails: ExtensionDetails): Promise<void> => {
    const onUninstallCallback = extensionDetails.sandbox?.spec?.onUninstall;

    if (onUninstallCallback) {
      try {
        await extensionDetails.sandbox?.runFunction(
          onUninstallCallback,
          {
            contextFunctions: ["notify"],
            usableEnv: { readable: [], writable: [] },
            config: extensionDetails.config
          },
          { notify }
        );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
      }
    }

    await client.extensions.uninstall.mutate({
      id: extensionDetails.id || ""
    });
    setInstalledExtensions((extensions) => {
      return extensions.filter((extension) => {
        return extension.id !== extensionDetails.id;
      });
    });
  };

  if (hostConfig.extensions) {
    client.extensions.changes.subscribe(undefined, {
      async onData({ action, data, userId }) {
        if (action === "create" && userId !== profile()?.id) {
          try {
            const response = await fetch(data.url);
            const spec = await response.json();
            const extensionDetails = {
              // @ts-ignore
              config: data.config,
              id: data.id,
              token: data.token,
              url: data.url,
              spec: processSpec(data.url, spec),
              get sandbox() {
                return extensionSandboxes.get(spec.name) || null;
              }
            };
            const sandbox = await loadExtensionSandbox(extensionDetails, client);

            extensionSandboxes.set(extensionDetails.spec.name, sandbox);
            setInstalledExtensions((extensions) => {
              return [extensionDetails, ...extensions];
            });
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
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
        loadingInstalledExtensions,
        loadingAvailableExtensions,
        installedExtensions,
        availableExtensions,
        installExtension,
        uninstallExtension
      }}
    >
      {props.children}
    </ExtensionsContext.Provider>
  );
};
const useExtensions = (): ExtensionsContextData => useContext(ExtensionsContext)!;

export {
  ExtensionsProvider,
  ExtensionsContext,
  ExtensionsContextData,
  useExtensions,
  isOfficialExtension
};
export type { ExtensionDetails };
