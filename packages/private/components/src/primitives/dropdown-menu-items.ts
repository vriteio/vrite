import type { JSX } from "solid-js";

interface MenuItem {
  label: string;
  icon?: string | (() => JSX.Element);
  color?: "base" | "danger";
  disabled?: boolean | string;
  shortcut?: string;
  selected?: boolean;
  items?: Array<MenuItem | (() => JSX.Element)> | Array<Array<MenuItem | (() => JSX.Element)>>;
  onClick?: (() => void) | (() => Promise<unknown>);
}
const isMenuItem = (item: unknown): item is MenuItem => {
  return typeof item === "object" && item !== null && typeof (item as MenuItem).label === "string";
};
const isJSXFactory = (item: unknown): item is () => JSX.Element => typeof item === "function";
const flattenWithSeparators = <O extends MenuItem>(
  options:
    | Array<(O & { value: string }) | (() => JSX.Element) | "separator">
    | Array<Array<(O & { value: string }) | (() => JSX.Element) | "separator">>
): Array<"separator" | (O & { value: string }) | (() => JSX.Element)> => {
  return options
    .map((option, index) => {
      if (Array.isArray(option)) {
        if (options.length - 1 === index) {
          return option;
        }

        return [...option, "separator" as const];
      }

      return [option];
    })
    .flat();
};
const addIndices = <O extends MenuItem>(
  options: Array<O | (() => JSX.Element)> | Array<Array<O | (() => JSX.Element)>>,
  prefix = ""
):
  | Array<(O & { value: string }) | (() => JSX.Element) | "separator">
  | Array<Array<(O & { value: string }) | (() => JSX.Element) | "separator">> => {
  let index = -1;

  return options.map((option) => {
    if (Array.isArray(option)) {
      const result: Array<(O & { value: string }) | (() => JSX.Element) | "separator"> = [];

      (option as Array<O | (() => JSX.Element) | Array<O | (() => JSX.Element)>>).forEach(
        (groupedOption) => {
          if (Array.isArray(groupedOption)) {
            if (result.length > 0) result.push("separator");

            (groupedOption as Array<O | (() => JSX.Element)>).forEach((item) => {
              if (!isMenuItem(item)) {
                result.push(item as () => JSX.Element);
                return;
              }

              index += 1;
              result.push({ ...item, value: `${prefix}${index}` });
            });
          } else {
            if (!isMenuItem(groupedOption)) {
              result.push(groupedOption as () => JSX.Element);
              return;
            }

            index += 1;
            result.push({ ...groupedOption, value: `${prefix}${index}` });
          }
        }
      );

      return result;
    }

    if (!isMenuItem(option)) return option as () => JSX.Element;

    index += 1;

    return { ...option, value: `${prefix}${index}` };
  }) as
    | Array<(O & { value: string }) | (() => JSX.Element) | "separator">
    | Array<Array<(O & { value: string }) | (() => JSX.Element) | "separator">>;
};

export { addIndices, flattenWithSeparators, isJSXFactory, isMenuItem };
export type { MenuItem };
