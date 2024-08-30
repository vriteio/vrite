import type { Client, JSONContent, ContentPieceWithAdditionalData } from "../api";

/* eslint-disable no-redeclare */
/* eslint-disable func-style */
/* eslint-disable no-use-before-define */
type ContextValue = string | number | boolean | undefined | null | ContextObject | ContextArray;
type ContextObject = {
  [x: string]: ContextValue;
};
type ContextArray = Array<ContextValue>;
type IsFunction<T, R, Fallback = T> = T extends (...args: any[]) => any ? R : Fallback;
type IsObject<T, R, Fallback = T> = IsFunction<
  T,
  Fallback,
  T extends object ? (T extends any[] ? Fallback : R) : Fallback
>;
type Tail<S> = S extends `${string}.${infer T}` ? Tail<T> : S;
type Value<T> = T[keyof T];
type FlattenStepOne<T> = {
  [K in keyof T as K extends string
    ? IsObject<T[K], `${K}.${keyof T[K] & string}`, K>
    : K]: IsObject<T[K], { [key in keyof T[K]]: T[K][key] }>;
};
type FlattenStepTwo<T> = {
  [a in keyof T]: IsObject<
    T[a],
    Value<{ [M in keyof T[a] as M extends Tail<a> ? M : never]: T[a][M] }>
  >;
};
type FlattenOneLevel<T> = FlattenStepTwo<FlattenStepOne<T>>;
type Flatten<T> = T extends FlattenOneLevel<T> ? T : Flatten<FlattenOneLevel<T>>;
type UsableEnv<R extends ContextObject = ContextObject, W extends ContextObject = ContextObject> = {
  readable: R;
  writable: W;
};
type ExtensionContentType =
  | "paragraph"
  | "heading"
  | "blockquote"
  | "element"
  | "image"
  | "codeBlock"
  | "embed"
  | "bulletList"
  | "orderedList"
  | "taskList"
  | "horizontalRule"
  | "table"
  | "block";
type UseEnv<C extends ExtensionBaseContext> = C[typeof __usableEnv] extends UsableEnv
  ? <
      K extends
        | keyof Flatten<C[typeof __usableEnv]["readable"]>
        | keyof Flatten<C[typeof __usableEnv]["writable"]>
        | keyof C[typeof __usableEnv]["readable"]
        | keyof C[typeof __usableEnv]["writable"]
    >(
      key: K
    ) => K extends keyof Flatten<C[typeof __usableEnv]["readable"]>
      ? Val<Flatten<C[typeof __usableEnv]["readable"]>[K]>
      : K extends keyof Flatten<C[typeof __usableEnv]["writable"]>
        ? [
            MutableVal<Flatten<C[typeof __usableEnv]["writable"]>[K]>,
            (value: Flatten<C[typeof __usableEnv]["writable"]>[K]) => void
          ]
        : K extends keyof C[typeof __usableEnv]["readable"]
          ? Val<C[typeof __usableEnv]["readable"][K]>
          : K extends keyof C[typeof __usableEnv]["writable"]
            ? [
                MutableVal<C[typeof __usableEnv]["writable"][K]>,
                (value: C[typeof __usableEnv]["writable"][K]) => void
              ]
            : never
  : never;

interface ExtensionBaseContext<C extends ContextObject = ContextObject> {
  client: Omit<Client, "reconfigure">;
  token: string;
  extensionId: string;
  config?: C;
  spec: ExtensionSpec;
  [__usableEnv]: UsableEnv<any, any>;
  use: UseEnv<this>;
  flush(): Promise<void>;
  notify(message: { text: string; type: "success" | "error" }): Promise<void>;
}
interface ExtensionBaseViewContext<C extends ContextObject = ContextObject>
  extends ExtensionBaseContext<C> {
  css(strings: TemplateStringsArray, ...values: Array<ContextValue>): string;
}
interface ExtensionConfigurationViewContext<C extends ContextObject = ContextObject>
  extends ExtensionBaseViewContext<C> {
  [__usableEnv]: UsableEnv<{ [__value]: any }, { config: C }>;
}
interface ExtensionContentPieceViewContext<
  C extends ContextObject = ContextObject,
  D extends ContextObject = ContextObject
> extends ExtensionBaseViewContext<C> {
  [__usableEnv]: UsableEnv<{ contentPiece: ContentPieceWithAdditionalData }, { data: D }>;
}
interface ExtensionBlockActionViewContext<C extends ContextObject = ContextObject>
  extends ExtensionBaseViewContext<C> {
  [__usableEnv]: UsableEnv<{ content: JSONContent }, { [__value]: any }>;
  replaceContent(contentHTML: string): Promise<void>;
  refreshContent(): Promise<void>;
}
interface ExtensionElementViewContext<
  C extends ContextObject = ContextObject,
  P extends Record<string, any> = Record<string, any>
> extends ExtensionBaseViewContext<C> {
  [__usableEnv]: UsableEnv<{ [__value]: any }, { props: P }>;
}

// eslint-disable-next-line init-declarations
declare const __brand: unique symbol;
// eslint-disable-next-line init-declarations
declare const __props: unique symbol;
// eslint-disable-next-line init-declarations
declare const __mutable: unique symbol;

const __usableEnv: unique symbol = Symbol("usableEnv");
const __value: unique symbol = Symbol("value");
const __id: unique symbol = Symbol("id");
const __componentName: unique symbol = Symbol("componentName");

type Brand<B> = { [__brand]: B };
type Val<V extends ContextValue | { [K: string]: Val } = ContextValue | { [K: string]: Val }> =
  Brand<"Val"> & {
    (): V;
    [__value]: V;
    [__id]: string;
  };
type MutableVal<
  V extends ContextValue | { [K: string]: MutableVal } = ContextValue | { [K: string]: MutableVal }
> = Val<V> & { [__mutable]: true };

type Func<C extends ExtensionBaseContext | never = never> = Brand<"Func"> & {
  (context: C): void | Promise<void>;
  [__id]: string;
};
interface ExtensionEnvironment {
  data: Record<string, Val>;
  func: Record<string, Func<any>>;
  views: Record<string, View<any>>;
  effects: Array<{
    [__id]: string;
    dependencies: string[];
    run: () => void;
  }>;
  currentScope: {
    func: string[];
    temp: string[];
    effects: string[];
    uid: string;
  } | null;
}
interface ExtensionMetadata {
  __value: typeof __value;
  __id: typeof __id;
  __componentName: typeof __componentName;
  __usableEnv: typeof __usableEnv;
}
type View<C extends Partial<ExtensionBaseViewContext> | never = never> = Brand<"View"> & {
  [__value]: (context: C) => ExtensionElement | Promise<ExtensionElement>;
  [__id]: string;
};

interface ExtensionSpec {
  name: string;
  description: string;
  displayName: string;
  permissions: string[];
  runtime: string;
  icon: string;
  iconDark?: string;
}
interface ExtensionBlockActionSpec {
  id: string;
  label: string;
  blocks: string[];
  view: string;
}
interface ExtensionPageSpec {
  mainView?: string;
  sidePanelView?: string;
}
interface ExtensionElementSpec {
  type: string;
  view: string;
}
interface ExtensionRuntimeSpec {
  onUninstall?: string;
  onConfigure?: string;
  configurationView?: string;
  contentPieceView?: string;
  blockActions?: ExtensionBlockActionSpec[];
  page?: ExtensionPageSpec;
  elements?: ExtensionElementSpec[];
}
interface Extension {
  getMetadata: () => ExtensionMetadata;
  getEnvironment: () => ExtensionEnvironment;
  triggerEffects: (...dependencies: string[]) => Promise<void>;
  generateRuntimeSpec: () => ExtensionRuntimeSpec;
  generateView: <C extends ExtensionBaseViewContext>(
    id: string,
    context: C,
    uid: string
  ) => Promise<ExtensionElement>;
  removeScope: (id: string) => void;
  runFunction: <C extends ExtensionBaseContext | never = never>(
    id: string,
    context: C,
    uid: string
  ) => Promise<void>;
}
type BaseProps<P extends Record<string, any>> = {
  [K in keyof P as Exclude<K, symbol>]?: P[K];
};
type BindableProps<P extends Record<string, any>, M extends string | never = never> = {
  [K in keyof P as `bind:${Exclude<Exclude<K, symbol>, M>}`]?: Val<P[K]>;
} & {
  [K in keyof P as `bind:${Extract<Exclude<K, symbol>, M>}`]?: MutableVal<P[K]>;
};
type EventProps<E extends string | never> = {
  [K in E as `on:${Exclude<K, symbol>}`]?: Func;
};
interface ExtensionBaseComponent<
  P extends Record<string, any> = Record<string, any>,
  E extends string | never = never,
  M extends string | never = never
> {
  (props: BaseProps<P> & BindableProps<P, M> & EventProps<E>): void;
  [__componentName]: string;
  [__props]: P;
}
interface ExtensionBaseComponents {
  // Element Components
  Content: ExtensionBaseComponent<{
    allowed?: ExtensionContentType[];
    initial?: string;
    class?: string;
    wrapperClass?: string;
  }>;
  Element: ExtensionBaseComponent<{ type: string }>;
  // Layout Components
  View: ExtensionBaseComponent<{ class: string }>;
  SidePanelHeader: ExtensionBaseComponent<
    {
      defaultSection: string;
      section: string;
      sections: Array<{
        label: string;
        icon?: string;
        id: string;
        action?: ExtensionElement;
      }>;
    },
    "back"
  >;
  SidePanelContent: ExtensionBaseComponent<{}>;
  // UI Components
  Field: ExtensionBaseComponent<
    {
      type: string;
      color: "base" | "contrast";
      label: string;
      textarea: boolean;
      value?: string | boolean;
      disabled: boolean;
      placeholder: string;
      optional: boolean;
      options?: Array<{ label: string; value: string }>;
    },
    "change",
    "value"
  >;
  Select: ExtensionBaseComponent<
    {
      options: Array<{ label: string; value: string }>;
      value?: string;
      class?: string;
      placeholder?: string;
      color?: "base" | "contrast";
      wrapperClass?: string;
    },
    "change",
    "value"
  >;
  Tooltip: ExtensionBaseComponent<{
    text: string;
    class: string;
    fixed: boolean;
    side?: "top" | "bottom" | "left" | "right";
  }>;
  Button: ExtensionBaseComponent<
    {
      color: "base" | "contrast" | "primary" | "danger" | "success";
      text: "base" | "contrast" | "primary" | "soft" | "danger" | "success";
      class: string;
      loading: boolean;
      disabled: boolean;
      hover: boolean;
      badge: boolean;
      variant: "text" | "solid";
      size: "small" | "medium" | "large";
      target: string;
      link: string;
    },
    "click"
  >;
  Card: ExtensionBaseComponent<{
    color: "base" | "contrast" | "primary";
    class: string;
  }>;
  Icon: ExtensionBaseComponent<{
    path: string;
    class: string;
  }>;
  IconButton: ExtensionBaseComponent<
    {
      color: "base" | "contrast" | "primary";
      text: "base" | "contrast" | "primary" | "soft";
      path: string;
      class: string;
      loading: boolean;
      disabled: boolean;
    },
    "click"
  >;
  CollapsibleSection: ExtensionBaseComponent<{
    icon: string;
    label: string;
    action?: ExtensionElement;
    color?: "base" | "primary";
    defaultOpened?: boolean;
  }>;
  // Control Components
  Switch: ExtensionBaseComponent<{}>;
  Match: ExtensionBaseComponent<{
    when?: ContextValue;
  }>;
  Show: ExtensionBaseComponent<{
    when: ContextValue;
  }>;
  Text: ExtensionBaseComponent<{
    content: ContextValue;
  }>;
}
type ExtensionElement = {
  slot: Array<ExtensionElement | string>;
  component: string;
  props?: Record<string, string | boolean | number>;
};
interface ExtensionRuntimeConfig<C extends ContextObject = ContextObject> {
  onUninstall?: Func<ExtensionBaseContext<C>>;
  onConfigure?: Func<ExtensionBaseContext<C>>;
  configurationView?: View<ExtensionConfigurationViewContext<C>>;
  contentPieceView?: View<ExtensionContentPieceViewContext<C>>;
  blockActions?: Array<
    Omit<ExtensionBlockActionSpec, "view"> & {
      view: View<ExtensionBlockActionViewContext<C>>;
    }
  >;
  elements?: Array<
    Omit<ExtensionElementSpec, "view"> & {
      view: View<ExtensionElementViewContext<C, any>>;
    }
  >;
  page?: {
    mainView?: View<ExtensionBaseViewContext<C>>;
    sidePanelView?: View<ExtensionBaseViewContext<C>>;
  };
}

const env: ExtensionEnvironment = {
  data: {},
  func: {},
  views: {},
  effects: [],
  currentScope: null
};
const triggerEffects = async (...dependencies: string[]): Promise<void> => {
  await Promise.all(
    env.effects
      .filter((effect) => {
        return effect.dependencies.some((dependency) => {
          return dependencies.includes(dependency);
        });
      })
      .map((effect) => {
        return effect.run();
      })
  );
};
const scopes: Record<string, { func: string[]; temp: string[]; effects: string[] }> = {};
const generateId = (): string => {
  return `_${Math.random().toString(36).substring(2, 9)}`;
};
const isVal = <T extends ContextValue>(value: T | Val<T>): value is Val<T> => {
  return (
    value &&
    (typeof value === "object" || typeof value === "function") &&
    __id in value &&
    __value in value
  );
};
const Components = new Proxy({} as ExtensionBaseComponents, {
  get(_, key) {
    const component = (): void => {};

    Object.defineProperty(component, __componentName, {
      value: key
    });

    return component;
  }
});

function createTemp<T extends ContextValue>(initialValue: T): [MutableVal<T>, (value: T) => void];
function createTemp<T extends ContextValue>(
  initialValue?: T
): [MutableVal<T | undefined>, (value: T | undefined) => void];
function createTemp<T extends ContextValue>(
  initialValue?: T
): [MutableVal<T | undefined>, (value: T | undefined) => void] {
  if (!env.data.temp) {
    const tempVal = (() => env.data.temp[__value]) as MutableVal<{
      [key: string]: MutableVal<ContextValue>;
    }>;

    Object.defineProperty(tempVal, __id, {
      value: `temp`
    });
    Object.defineProperty(tempVal, __value, { value: {}, writable: true });
    env.data.temp = tempVal;
  }

  const id = generateId();
  const setter = (value: T | undefined): void => {
    const tempVal = env.data.temp as MutableVal<{
      [key: string]: MutableVal<ContextValue>;
    }>;

    if (tempVal[__value][id]) {
      tempVal[__value][id][__value] = value;
    }

    triggerEffects(`temp.${id}`);
  };
  const temp = (() => {
    const tempVal = env.data.temp as MutableVal<{
      [key: string]: MutableVal<ContextValue>;
    }>;

    return tempVal[__value][id]![__value];
  }) as MutableVal<T | undefined>;

  Object.defineProperty(temp, __id, {
    value: `temp.${id}`
  });
  Object.defineProperty(temp, __value, { value: initialValue, writable: true });
  (
    env.data.temp as MutableVal<{
      [key: string]: MutableVal<ContextValue>;
    }>
  )[__value][id] = temp;

  if (env.currentScope) {
    env.currentScope.temp.push(id);
  }

  return [temp, setter];
}

function effect<D extends Val[]>(
  run: () => void,
  dependencies: D,
  options?: { initial?: boolean }
): void {
  const id = generateId();

  env.effects.push({
    [__id]: id,
    dependencies: dependencies.map((dep) => dep[__id]),
    run
  });

  if (env.currentScope) {
    env.currentScope.effects.push(id);
  }

  if (options?.initial) {
    run();
  }
}

const computed = Object.assign(
  function <O extends ContextValue>(compute: () => O, dependencies: Val[]): Val<O> {
    const [computedTemp, setComputedTemp] = createTemp<O>(compute());

    effect(
      () => {
        setComputedTemp(compute());
      },
      dependencies,
      { initial: true }
    );

    return computedTemp as Val<O>;
  },
  {
    eq: (...values: Array<Val<ContextValue> | ContextValue>): Val<boolean> => {
      const vals = values.filter(isVal);

      return computed(() => {
        return values.every((value) => {
          return (isVal(value) ? value() : value) === (isVal(values[0]) ? values[0]() : values[0]);
        });
      }, vals);
    },
    neq: (...values: Array<Val<ContextValue> | ContextValue>): Val<boolean> => {
      const vals = values.filter(isVal);

      return computed(() => {
        return values.some((value) => {
          return (isVal(value) ? value() : value) !== (isVal(values[0]) ? values[0]() : values[0]);
        });
      }, vals);
    },
    gt: (a: number | Val<number>, b: number | Val<number>): Val<boolean> => {
      const dependencies: Val<number>[] = [...(isVal(a) ? [a] : []), ...(isVal(b) ? [b] : [])];

      return computed(() => (isVal(a) ? a() : a) > (isVal(b) ? b() : b), dependencies);
    },
    lt: (a: number | Val<number>, b: number | Val<number>): Val<boolean> => {
      const dependencies: Val<number>[] = [...(isVal(a) ? [a] : []), ...(isVal(b) ? [b] : [])];

      return computed(() => (isVal(a) ? a() : a) < (isVal(b) ? b() : b), dependencies);
    },
    and: (...values: Array<Val<ContextValue> | ContextValue>): Val<boolean> => {
      const vals = values.filter(isVal);

      return computed(() => {
        return values.every((value) => (isVal(value) ? value() : value));
      }, vals);
    },
    or: (...values: Array<Val<ContextValue> | ContextValue>): Val<boolean> => {
      const vals = values.filter(isVal);

      return computed(() => {
        return values.some((value) => (isVal(value) ? value() : value));
      }, vals);
    },
    not: (value: Val<ContextValue> | ContextValue): Val<boolean> => {
      return computed(() => !(isVal(value) ? value() : value), isVal(value) ? [value] : []);
    },
    add: (...values: Array<Val<number> | number>): Val<number> => {
      const vals = values.filter(isVal);

      return computed(() => {
        return values.reduce<number>((acc, val) => acc + (isVal(val) ? val() : val), 0);
      }, vals);
    },
    join: (...values: Array<Val<string> | string>): Val<string> => {
      const vals = values.filter(isVal);

      return computed(() => {
        return values.reduce<string>((acc, val) => acc + (isVal(val) ? val() : val), "");
      }, vals);
    },
    sub: (...values: Val<number>[]): Val<number> => {
      const vals = values.filter(isVal);

      return computed(() => {
        return values.reduce((acc, val) => acc - val(), 0);
      }, vals);
    },
    mul: (...values: Val<number>[]): Val<number> => {
      const vals = values.filter(isVal);

      return computed(() => {
        return values.reduce((acc, val) => acc * val(), 1);
      }, vals);
    },
    div: (a: number | Val<number>, b: number | Val<number>): Val<number> => {
      const dependencies: Val<number>[] = [...(isVal(a) ? [a] : []), ...(isVal(b) ? [b] : [])];

      return computed(() => (isVal(a) ? a() : a) / (isVal(b) ? b() : b), dependencies);
    },
    mod: (a: number | Val<number>, b: number | Val<number>): Val<number> => {
      const dependencies: Val<number>[] = [...(isVal(a) ? [a] : []), ...(isVal(b) ? [b] : [])];

      return computed(() => (isVal(a) ? a() : a) % (isVal(b) ? b() : b), dependencies);
    },
    neg: (value: number | Val<number>): Val<number> => {
      return computed(() => -(isVal(value) ? value() : value), isVal(value) ? [value] : []);
    },
    when: <T extends ContextValue, F extends ContextValue = undefined>(
      condition: ContextValue | Val<ContextValue>,
      ifTrue: T | Val<T>,
      ifFalse?: F | Val<F>
    ): F extends undefined ? Val<T | null> : Val<T> => {
      const dependencies: Val<ContextValue>[] = isVal(condition) ? [condition] : [];
      const trueDependencies: Val<T>[] = isVal(ifTrue) ? [ifTrue] : [];
      const falseDependencies: Val<F>[] = isVal(ifFalse) ? [ifFalse] : [];

      return computed(() => {
        if (isVal(condition) ? condition() : condition) {
          return isVal(ifTrue) ? ifTrue() : ifTrue;
        }

        if (ifFalse) {
          return isVal(ifFalse) ? ifFalse() : ifFalse;
        }

        return null;
      }, [...dependencies, ...trueDependencies, ...falseDependencies]) as F extends undefined
        ? Val<T | null>
        : Val<T>;
    }
  }
);
const createFunction = <C extends ExtensionBaseContext | never = never>(
  run: (context: C) => void
): Func<C> => {
  const id = generateId();
  const func = run as Func<C>;

  Object.defineProperty(func, __id, {
    value: id
  });
  env.func[id] = func;

  if (env.currentScope) {
    env.currentScope.func.push(id);
  }

  return func;
};
const createElement = <C extends ExtensionBaseComponent<any>>(
  component: C,
  props: C[typeof __props],
  ...children: Array<ExtensionElement | string>
): ExtensionElement => {
  return {
    component: component[__componentName] || "Fragment",
    slot: children,
    props: Object.fromEntries(
      Object.keys(props || {}).map((key) => {
        const value = props[key];

        if (value && value[__id]) {
          return [key, value[__id]];
        }

        return [key, value];
      })
    )
  };
};
const createFragment = (...children: Array<ExtensionElement | string>): ExtensionElement => {
  return {
    component: "Fragment",
    slot: children,
    props: {}
  };
};
const createView = <C extends ExtensionBaseViewContext>(
  run: (context: C) => ExtensionElement
): View<C> => {
  const id = generateId();
  const view = {
    [__id]: id,
    [__value]: run
  } as View<C>;

  env.views[id] = view;

  return view;
};
const removeScope = (id: string): void => {
  const scope = scopes[id];

  if (scope) {
    scope.func.forEach((funcId) => {
      delete env.func[funcId];
    });
    scope.temp.forEach((tempId) => {
      const tempVal = env.data.temp as MutableVal<{
        [key: string]: MutableVal<ContextValue>;
      }>;

      if (tempVal()) {
        delete tempVal()[tempId];
      }
    });
    scope.effects.forEach((effectId) => {
      env.effects = env.effects.filter((effect) => {
        return effect[__id] !== effectId;
      });
    });
  }
};
const createRuntime = <C extends ContextObject = ContextObject>(
  runtimeConfig: ExtensionRuntimeConfig<C>
): Extension => {
  return {
    getEnvironment: () => env,
    getMetadata: () => ({
      __value,
      __id,
      __componentName,
      __usableEnv
    }),
    triggerEffects,
    generateRuntimeSpec: () => {
      return {
        ...runtimeConfig,
        onUninstall: runtimeConfig.onUninstall?.[__id],
        onConfigure: runtimeConfig.onConfigure?.[__id],
        configurationView: runtimeConfig.configurationView?.[__id],
        contentPieceView: runtimeConfig.contentPieceView?.[__id],
        blockActions: runtimeConfig.blockActions?.map((blockAction) => ({
          ...blockAction,
          view: blockAction.view[__id]
        })),
        elements: runtimeConfig.elements?.map((element) => ({
          ...element,
          view: element.view[__id]
        })),
        page:
          (runtimeConfig.page && {
            mainView: runtimeConfig.page.mainView?.[__id],
            sidePanelView: runtimeConfig.page.sidePanelView?.[__id]
          }) ||
          undefined
      };
    },
    generateView: async <C extends ExtensionBaseViewContext>(
      id: string,
      context: C,
      uid: string
    ) => {
      const runView = env.views[id]?.[__value];

      if (runView) {
        env.currentScope = {
          func: [],
          temp: [],
          effects: [],
          uid
        };

        const element = await runView(context);

        scopes[`view:${uid}`] = env.currentScope;
        env.currentScope = null;

        return element;
      }

      return {
        component: "",
        slot: []
      };
    },
    runFunction: async <C extends ExtensionBaseContext | never = never>(
      id: string,
      context: C,
      uid: string
    ) => {
      const runFunc = env.func[id];

      if (runFunc) {
        env.currentScope = {
          func: [],
          temp: [],
          effects: [],
          uid
        };
        await runFunc(context);
        scopes[`func:${uid}`] = env.currentScope;
        env.currentScope = null;
        removeScope(`func:${uid}`);
      }
    },
    removeScope
  };
};

export {
  Components,
  createView,
  createTemp,
  createFunction,
  createElement,
  createFragment,
  createRuntime,
  effect,
  computed,
  generateId,
  isVal
};
export type {
  Extension,
  ExtensionEnvironment,
  ExtensionMetadata,
  ExtensionSpec,
  ExtensionRuntimeSpec,
  ExtensionBlockActionSpec,
  ExtensionElementSpec,
  ExtensionBaseComponents,
  ExtensionBaseViewContext,
  ExtensionBaseContext,
  ExtensionBlockActionViewContext,
  ExtensionContentPieceViewContext,
  ExtensionConfigurationViewContext,
  ExtensionElementViewContext,
  ExtensionElement,
  ContextObject,
  ContextValue,
  ExtensionContentType,
  View,
  Func,
  Val,
  MutableVal,
  Brand
};
