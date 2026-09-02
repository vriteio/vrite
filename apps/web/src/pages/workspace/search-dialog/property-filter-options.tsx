import type { MenuItem } from "@andesine/components";
import type { JSX } from "solid-js";

interface FilterOption<T extends string = string> {
  icon?: MenuItem["icon"];
  label: string;
  value: T;
}
interface PropertyTypeOption extends FilterOption<PropertyFilterKind> {
  icon: string;
}

type PropertyFilterKind = "boolean" | "date" | "number" | "text";

const PROPERTY_TYPE_OPTIONS: PropertyTypeOption[] = [
  { value: "text", label: "Text", icon: "i-lucide:text" },
  { value: "number", label: "Number", icon: "i-lucide:hash" },
  { value: "boolean", label: "Checkbox", icon: "i-lucide:toggle-right" },
  { value: "date", label: "Date", icon: "i-lucide:calendar" }
];
const TEXT_OPERATOR_OPTIONS: FilterOption[] = [
  { value: "any", label: "Any of", icon: "i-lucide:list-todo" },
  { value: "all", label: "All of", icon: "i-lucide:list-checks" },
  { value: "none", label: "None of", icon: "i-lucide:list-x" }
];
const createComparisonIcon = (symbol: string): (() => JSX.Element) => {
  return () => (
    <span
      class="flex h-full w-full items-center justify-center font-mono text-sm"
      style={{
        "font-feature-settings": '"liga" 1, "calt" 1',
        "font-variant-ligatures": "common-ligatures contextual"
      }}
    >
      {symbol}
    </span>
  );
};
const COMPARISON_OPERATOR_OPTIONS: FilterOption[] = [
  { value: "equals", label: "Equals", icon: createComparisonIcon("==") },
  { value: "notEquals", label: "Does not equal", icon: createComparisonIcon("!=") },
  { value: "greaterThan", label: "Greater than", icon: createComparisonIcon(">") },
  {
    value: "greaterThanOrEqual",
    label: "Greater than or equal",
    icon: createComparisonIcon(">=")
  },
  { value: "lessThan", label: "Less than", icon: createComparisonIcon("<") },
  {
    value: "lessThanOrEqual",
    label: "Less than or equal",
    icon: createComparisonIcon("<=")
  }
];
const BOOLEAN_VALUE_OPTIONS: FilterOption[] = [
  { value: "true", label: "Checked", icon: "i-lucide:check" },
  { value: "false", label: "Not checked", icon: "i-lucide:x" }
];

export {
  BOOLEAN_VALUE_OPTIONS,
  COMPARISON_OPERATOR_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  TEXT_OPERATOR_OPTIONS
};
export type { FilterOption, PropertyFilterKind, PropertyTypeOption };
