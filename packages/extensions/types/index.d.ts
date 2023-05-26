declare module "@vrite/extensions" {
  import type { Client } from "@vrite/sdk";
  import type { ContentPieceWithTags } from "@vrite/backend";

  // eslint-disable-next-line no-use-before-define
  type ContextValue = string | number | boolean | ContextObject | ContextArray;

  interface ContextObject {
    [x: string]: ContextValue;
  }

  interface ContextArray extends Array<ContextValue> {}
  interface ExtensionView {
    [key: `slot:${string}`]: string | ExtensionView | ExtensionView[];
    component: string;
    props?: Record<string, string | boolean | number>;
  }
  interface ExtensionSpec {
    id: string;
    name: string;
    description: string;
    permissions: string[];
    icon?: string;
    darkIcon?: string;
    lifecycle?: {
      "on:install"?: string;
      "on:uninstall"?: string;
      "on:configure"?: string;
      "on:initContentPieceView"?: string;
      "on:initConfigurationView"?: string;
    };
    configurationView?: ExtensionView | ExtensionView[];
    contentPieceView?: ExtensionView | ExtensionView[];
    functions: Record<string, string>;
  }

  interface ExtensionBaseContext {
    spec: Pick<ExtensionSpec, "id" | "name" | "description">;
    temp: ContextObject;
    config: ContextObject;
    client: Omit<Client, "reconfigure">;
    setTemp(key: string, value: ContextValue): void;
    setTemp(config: ContextObject): void;
  }
  interface ExtensionInstallationContext extends ExtensionBaseContext {
    addWebhook(): Promise<void>;
    removeWebhook(): Promise<void>;
  }
  interface ExtensionConfigurationViewContext extends ExtensionBaseContext {
    setConfig(key: string, value: ContextValue): void;
    setConfig(config: ContextObject): void;
  }
  interface ExtensionContentPieceViewContext extends ExtensionBaseContext {
    contentPiece: ContentPieceWithTags;
    data: ContextObject;
    setData(key: string, value: ContextValue): void;
  }

  type ExtensionGeneralContext =
    | ExtensionBaseContext
    | ExtensionInstallationContext
    | ExtensionConfigurationViewContext
    | ExtensionContentPieceViewContext;

  export {
    ContextValue,
    ContextObject,
    ContextArray,
    ExtensionBaseContext,
    ExtensionInstallationContext,
    ExtensionConfigurationViewContext,
    ExtensionContentPieceViewContext,
    ExtensionGeneralContext,
    ExtensionSpec,
    ExtensionView
  };
}
declare module "@vrite/extensions/*.json" {
  import { ExtensionSpec } from "@vrite/extensions";

  const spec: ExtensionSpec;

  export = spec;
}
