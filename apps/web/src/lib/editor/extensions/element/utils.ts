import { ExtensionDetails } from "#context";
import { ExtensionElementSpec } from "@vrite/sdk/extensions";

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

export { getCustomElements };
