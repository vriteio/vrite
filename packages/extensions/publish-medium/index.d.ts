declare module "vrite:extension" {
  type Distinct<T, DistinctName> = T & { __TYPE__: DistinctName };

  type VriteElement = {
    type: string;
    props: Record<string, any>;
  };
  type VriteComponent<P = {}> = (props: P) => VriteElement | null;
  type VriteFunction = {};

  function createElement<P = {}>(
    type: VriteComponent<P>,
    props: P & { value?: Distinct<unknown, "value"> },
    ...children: VriteElement[]
  ): VriteElement;
  function createExtension(extensionConfig: {
    name: string;
    displayName: string;
    description: string;
    permissions: string[];
    blockActions: VriteElement[];
  }): { json: string; functions: Record<string, VriteFunction> };
  function createFunction<P = {}>(fn: (props: P) => void): VriteFunction;
  function createTemp<T>(initialValue?: T): [Distinct<T, "value">, (value: T) => void];
}
