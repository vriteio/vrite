import {
  ExtensionElement,
  ExtensionElementSpec,
  ExtensionElementViewContext
} from "@vrite/sdk/extensions";
import { ResolvedPos, Node as PMNode } from "@tiptap/pm/model";
import { nanoid } from "nanoid";
import { JSONContent } from "@vrite/sdk/api";
import { ExtensionDetails } from "#context";

type StructureNode = { element?: string; content?: true | StructureNode[]; allowed?: string[] };
type CustomView = {
  type: string;
  uid: string;
  extension: ExtensionDetails;
  views: Array<{ path: string[]; view: ExtensionElement; top?: boolean }>;
  structure: StructureNode;
  getPos(): number;
  node(): PMNode;
};

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
const createCustomView = async (
  elementSpec: ExtensionElementSpec,
  extension: ExtensionDetails,
  getters: Pick<CustomView, "getPos" | "node">
): Promise<CustomView | null> => {
  const uid = nanoid();
  const generatedViewData = await extension.sandbox?.generateView<ExtensionElementViewContext>(
    elementSpec.view,
    {
      contextFunctions: ["notify"],
      usableEnv: { readable: [], writable: ["props"] },
      config: extension.config || {}
    },
    { notify: () => {} },
    uid
  );

  if (!generatedViewData) return null;

  const views: CustomView["views"] = [
    {
      path: [elementSpec.type.toLowerCase()],
      view: generatedViewData.view,
      top: true
    }
  ];
  const structure: StructureNode = { element: elementSpec.type };
  const processElementTree = (
    parentPath: string[],
    parentStructureNode: StructureNode,
    element: ExtensionElement,
    index?: number
  ): void => {
    const processSlot = (parentPath: string[], parentStructureNode: StructureNode): void => {
      element.slot?.forEach((childElement, index) => {
        if (typeof childElement === "object") {
          processElementTree(parentPath, parentStructureNode, childElement, index);
        }
      });
    };

    if (element.component === "Element") {
      const path = [
        ...parentPath,
        `${element.props?.type || ""}${typeof index === "number" ? `#${index}` : ""}`.toLowerCase()
      ];
      const view = { path, view: { component: "Fragment", slot: element.slot } };
      const structure = { element: `${element.props?.type || ""}` };

      views.push(view);
      parentStructureNode.content = [
        ...(Array.isArray(parentStructureNode.content) ? parentStructureNode.content : []),
        structure
      ];
      processSlot(path, structure);

      return;
    }

    if (element.component === "Content") {
      if (element.slot.length) {
        processSlot(parentPath, parentStructureNode);

        return;
      }

      parentStructureNode.content = true;
      parentStructureNode.allowed = element.props?.allowed as any as string[];

      return;
    }

    processSlot(parentPath, parentStructureNode);
  };

  processElementTree([elementSpec.type.toLowerCase()], structure, generatedViewData.view);

  return {
    uid,
    type: elementSpec.type.toLowerCase(),
    extension,
    views,
    structure,
    ...getters
  };
};
const applyStructure = (node: PMNode, structure: StructureNode): JSONContent => {
  const nodeJSON = node.toJSON() as JSONContent;
  const applyStructureToNode = (
    nodeJSON: JSONContent | null,
    structureNode: StructureNode
  ): JSONContent | null => {
    if (typeof structureNode.content === "boolean") {
      let defaultNodeType = "paragraph";

      if (
        structureNode.allowed &&
        !structureNode.allowed.includes("paragraph") &&
        !structureNode.allowed.includes("block")
      ) {
        defaultNodeType = structureNode.allowed[0] || "";
      }

      return {
        type: "element",
        attrs: { ...nodeJSON?.attrs, type: `${structureNode.element}` },
        ...((nodeJSON?.content?.length || defaultNodeType) && {
          content: nodeJSON?.content?.filter((content) => {
            return !structureNode.allowed || structureNode.allowed.includes(content.type);
          }) || [{ type: defaultNodeType, content: [] }]
        })
      };
    } else if (structureNode.content) {
      return {
        type: "element",
        attrs: { ...nodeJSON?.attrs, type: `${structureNode.element}` },
        content: structureNode.content
          .map((childStructureNode, index) => {
            const childNodeJSON = nodeJSON?.content?.[index];

            return applyStructureToNode(childNodeJSON || null, childStructureNode);
          })
          .filter(Boolean) as JSONContent[]
      };
    }

    return {
      type: "element",
      attrs: { ...nodeJSON?.attrs, type: `${structureNode.element}` }
    };
  };

  return applyStructureToNode(nodeJSON, structure)!;
};

export { getCustomElements, getElementPath, createCustomView, applyStructure };
export type { CustomView, StructureNode };
