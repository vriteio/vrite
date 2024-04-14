import { ExtensionElementSpec } from "@vrite/sdk/extensions";
import { ResolvedPos, Node as PMNode } from "@tiptap/pm/model";
import { ExtensionDetails } from "#context";

const getCustomElements = (
  installedExtensions?: () => ExtensionDetails[]
): Record<
  string,
  {
    element: ExtensionElementSpec;
    extension: ExtensionDetails;
  }
> => {
  const elements: Record<
    string,
    {
      element: ExtensionElementSpec;
      extension: ExtensionDetails;
    }
  > = {};

  installedExtensions?.().forEach((extension) => {
    if (!extension.id) return;

    const spec = extension.sandbox?.spec;

    if (spec?.elements) {
      spec.elements.forEach((element) => {
        elements[element.type.toLowerCase()] = {
          element,
          extension
        };
      });
    }
  });

  return elements;
};
const getElementPath = (
  resolvedPos: ResolvedPos,
  customElements: Record<
    string,
    {
      element: ExtensionElementSpec;
      extension: ExtensionDetails;
    }
  >
): string[] => {
  let path: string[] = [];

  const appendToPath = (node: PMNode, index: number): void => {
    if (node.type.name === "element") {
      const type = `${node.attrs.type || "element"}`.toLowerCase();

      if (!path.length) {
        path = [type];
      } else if (customElements[type]) {
        path = [type];
      } else {
        path.push(`${type}#${index}`);
      }
    }
  };

  for (let i = 0; i <= resolvedPos.depth; i++) {
    const node = resolvedPos.node(i);
    const index = resolvedPos.index(i);

    appendToPath(node, index);
  }

  appendToPath(resolvedPos.nodeAfter!, resolvedPos.index());

  return path;
};

export { getCustomElements, getElementPath };
