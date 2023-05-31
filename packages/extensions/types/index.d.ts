declare module "@vrite/extensions" {
  import type { Client } from "@vrite/sdk";
  import type { ExtendedContentPieceWithTags, TokenPermission } from "@vrite/backend";

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
    name: string;
    displayName: string;
    description: string;
    permissions: TokenPermission[];
    icon?: string;
    darkIcon?: string;
    lifecycle?: {
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
    spec: Pick<ExtensionSpec, "name" | "displayName" | "description">;
    config: ContextObject;
    client: Omit<Client, "reconfigure">;
    token: string;
    extensionId: string;
    notify(message: { text: string; type: "success" | "error" }): void;
  }
  interface ExtensionBaseViewContext extends ExtensionBaseContext {
    temp: ContextObject;
    setTemp(key: string, value: ContextValue): void;
    setTemp(config: ContextObject): void;
  }
  interface ExtensionConfigurationViewContext extends ExtensionBaseViewContext {
    setConfig(key: string, value: ContextValue): void;
    setConfig(config: ContextObject): void;
  }
  interface ExtensionContentPieceViewContext extends ExtensionBaseViewContext {
    contentPiece: ExtendedContentPieceWithTags<"slug" | "locked" | "coverWidth">;
    data: ContextObject;
    setData(key: string, value: ContextValue): void;
    setData(data: ContextObject): void;
  }

  type ExtensionGeneralContext =
    | ExtensionBaseContext
    | ExtensionBaseViewContext
    | ExtensionConfigurationViewContext
    | ExtensionContentPieceViewContext;

  type ExtensionGeneralViewContext =
    | ExtensionBaseViewContext
    | ExtensionConfigurationViewContext
    | ExtensionContentPieceViewContext;

  export {
    ContextValue,
    ContextObject,
    ContextArray,
    ExtensionBaseContext,
    ExtensionBaseViewContext,
    ExtensionConfigurationViewContext,
    ExtensionContentPieceViewContext,
    ExtensionGeneralContext,
    ExtensionGeneralViewContext,
    ExtensionSpec,
    ExtensionView
  };
}
declare module "@vrite/extensions/*.json" {
  import { ExtensionSpec } from "@vrite/extensions";

  const spec: ExtensionSpec;

  export = spec;
}
