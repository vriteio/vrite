import {
  Button,
  DatePicker,
  DropdownMenu,
  formatDatePickerValue,
  IconButton,
  TagInput,
  Tooltip,
  type MenuItem
} from "@andesine/components";
import clsx from "clsx";
import {
  type Component,
  createEffect,
  createSignal,
  type JSX,
  Match,
  Show,
  Switch
} from "solid-js";
import { Dynamic } from "solid-js/web";
import type { SearchPropertyFilter } from "#web/lib/data";
import { FilterInput, PropertyFilterName } from "./filter-input";
import {
  BOOLEAN_VALUE_OPTIONS,
  COMPARISON_OPERATOR_OPTIONS,
  type FilterOption,
  PROPERTY_TYPE_OPTIONS,
  type PropertyFilterKind,
  type PropertyTypeOption,
  TEXT_OPERATOR_OPTIONS
} from "./property-filter-options";

interface PropertyFilterDraft {
  id: number;
  key: string;
  kind: PropertyFilterKind;
  name: string;
  operator:
    | "all"
    | "any"
    | "equals"
    | "greaterThan"
    | "greaterThanOrEqual"
    | "lessThan"
    | "lessThanOrEqual"
    | "none"
    | "notEquals";
  value: string;
  values: string[];
}
interface FilterMenuProps {
  filter: PropertyFilterDraft;
  opened: boolean;
  remove(): void;
  setOpened(opened: boolean): void;
  update(update: Partial<PropertyFilterDraft>): void;
}
interface FilterControlProps {
  filter: PropertyFilterDraft;
  update(update: Partial<PropertyFilterDraft>): void;
}
interface FilterConfigurationMenuProps extends FilterControlProps {
  actions: Array<MenuItem | (() => JSX.Element)>;
  disabled?: boolean;
  opened: boolean;
  placement: "bottom-end" | "bottom-start";
  title: string;
  trigger: Component<{ contextMenu: boolean; opened: boolean }>;
  setOpened(opened: boolean): void;
}
interface NewPropertyFilterMenuProps {
  add(filter: PropertyFilterDraft): void;
  disabled: boolean;
  opened: boolean;
  setOpened(opened: boolean): void;
}

type ComparisonOperator = Extract<
  PropertyFilterDraft["operator"],
  "equals" | "greaterThan" | "greaterThanOrEqual" | "lessThan" | "lessThanOrEqual" | "notEquals"
>;
type TextOperator = Extract<PropertyFilterDraft["operator"], "all" | "any" | "none">;

const MAX_TEXT_FILTER_VALUES = 20;
const MAX_TEXT_FILTER_VALUE_LENGTH = 500;
const getPropertyTypeOption = (kind: PropertyFilterKind): PropertyTypeOption => {
  return PROPERTY_TYPE_OPTIONS.find(({ value }) => value === kind)!;
};
const getConditionOptions = (filter: PropertyFilterDraft): FilterOption[] => {
  if (filter.kind === "text") return TEXT_OPERATOR_OPTIONS;
  if (filter.kind === "boolean") return BOOLEAN_VALUE_OPTIONS;

  return COMPARISON_OPERATOR_OPTIONS;
};
const getConditionValue = (filter: PropertyFilterDraft): string => {
  return filter.kind === "boolean" ? filter.value : filter.operator;
};
const getConditionOption = (filter: PropertyFilterDraft): FilterOption => {
  const value = getConditionValue(filter);

  return getConditionOptions(filter).find((option) => option.value === value)!;
};
const getConditionUpdate = (
  filter: PropertyFilterDraft,
  value: string
): Partial<PropertyFilterDraft> => {
  if (filter.kind === "boolean") return { value };

  return { operator: value as PropertyFilterDraft["operator"] };
};
const isTextOperator = (operator: PropertyFilterDraft["operator"]): operator is TextOperator => {
  return operator === "all" || operator === "any" || operator === "none";
};
const isComparisonOperator = (
  operator: PropertyFilterDraft["operator"]
): operator is ComparisonOperator => {
  return COMPARISON_OPERATOR_OPTIONS.some(({ value }) => value === operator);
};
const createPropertyFilterDraft = (
  id: number,
  kind: PropertyFilterKind = "text"
): PropertyFilterDraft => ({
  id,
  key: "",
  kind,
  name: "",
  operator: kind === "text" ? "any" : "equals",
  value: kind === "boolean" ? "true" : "",
  values: []
});
const isValueSupported = (kind: PropertyFilterKind, value: string): boolean => {
  if (kind === "boolean") return value === "true" || value === "false";
  if (kind === "number") return Boolean(value) && Number.isFinite(Number(value));
  if (kind === "date") return /^\d{4}-\d{2}-\d{2}$/.test(value);

  return false;
};
const getFilterKindUpdate = (
  filter: PropertyFilterDraft,
  kind: PropertyFilterKind
): Partial<PropertyFilterDraft> => {
  const nextFilter = createPropertyFilterDraft(filter.id, kind);
  const comparisonKindChanged =
    filter.kind !== kind &&
    ["date", "number"].includes(filter.kind) &&
    ["date", "number"].includes(kind);
  const value = isValueSupported(kind, filter.value) ? filter.value : nextFilter.value;

  if (filter.kind === kind) return { kind };

  return {
    kind,
    operator: comparisonKindChanged ? filter.operator : nextFilter.operator,
    value,
    values: nextFilter.values
  };
};
const getSearchPropertyFilter = (draft: PropertyFilterDraft): SearchPropertyFilter | undefined => {
  const key = draft.key.trim();

  if (!key) return;

  if (draft.kind === "text") {
    const invalidValues =
      draft.values.length === 0 ||
      draft.values.length > MAX_TEXT_FILTER_VALUES ||
      draft.values.some((value) => value.length > MAX_TEXT_FILTER_VALUE_LENGTH);

    if (!isTextOperator(draft.operator) || invalidValues) return;

    return { kind: "text", key, operator: draft.operator, values: draft.values };
  }

  if (draft.kind === "boolean") return { kind: "boolean", key, value: draft.value === "true" };

  if (!isComparisonOperator(draft.operator) || !draft.value) return;

  if (draft.kind === "date") {
    return { kind: "date", key, operator: draft.operator, value: draft.value };
  }

  const value = Number(draft.value);

  if (!Number.isFinite(value)) return;

  return { kind: "number", key, operator: draft.operator, value };
};
const getFilterSummary = (filter: PropertyFilterDraft): string => {
  const name = filter.name.trim() || getPropertyTypeOption(filter.kind).label;
  const value = filter.kind === "text" ? filter.values.join(", ") : filter.value;

  if (filter.kind === "boolean") return `${name} · ${getConditionOption(filter).label}`;
  if (value) return `${name} · ${getConditionOption(filter).label} ${value}`;

  return name;
};
const getFilterLabel = (filter: PropertyFilterDraft): string => {
  return filter.name.trim() || getPropertyTypeOption(filter.kind).label;
};
const getFilterBadgeValue = (filter: PropertyFilterDraft): string | undefined => {
  if (filter.kind === "boolean") return;

  const value = filter.kind === "text" ? filter.values.join(", ") : filter.value;

  if (filter.kind === "date" && value) return formatDatePickerValue(value);

  return value || undefined;
};

const FilterValue: Component<FilterControlProps> = (props) => (
  <Show when={props.filter.kind !== "boolean"}>
    <div class="w-full min-w-0 p-1 md:min-w-60">
      <Switch>
        <Match when={props.filter.kind === "text"}>
          <TagInput
            disableAutoFocus
            label="Values"
            maxLength={MAX_TEXT_FILTER_VALUE_LENGTH}
            maxValues={MAX_TEXT_FILTER_VALUES}
            values={props.filter.values}
            setValues={(values) => props.update({ values })}
            placeholder="Add value"
            validate={(values) => {
              if (values.length === 0) return "Enter at least one value.";
              if (values.length > MAX_TEXT_FILTER_VALUES) return "Enter up to 20 values.";
              if (values.some((value) => value.length > MAX_TEXT_FILTER_VALUE_LENGTH)) {
                return "Each value must contain up to 500 characters.";
              }
            }}
          />
        </Match>
        <Match when={props.filter.kind === "number"}>
          <FilterInput
            disableAutoFocus
            label="Value"
            type="number"
            value={props.filter.value}
            setValue={(value) => props.update({ value })}
            validate={(value) => {
              return !value || !Number.isFinite(Number(value))
                ? "Enter a valid number."
                : undefined;
            }}
          />
        </Match>
        <Match when={props.filter.kind === "date"}>
          <div class="flex min-w-0 flex-col gap-1">
            <span class="text-xs leading-[1] text-gray-400">Value</span>
            <DatePicker
              class="w-full"
              placement="right-start"
              portal={false}
              positioningStrategy="absolute"
              showCalendarIcon={false}
              triggerClass=":base-2: bg-gray-50 p-1 px-2 font-normal"
              value={props.filter.value}
              setValue={(value) => props.update({ value })}
            />
          </div>
        </Match>
      </Switch>
    </div>
  </Show>
);
const FilterConfigurationMenu: Component<FilterConfigurationMenuProps> = (props) => {
  const typeItem = (option: FilterOption<PropertyFilterKind>): MenuItem => ({
    icon: option.icon,
    label: option.label,
    selected: props.filter.kind === option.value,
    closeOnSelect: false,
    onClick: () => props.update(getFilterKindUpdate(props.filter, option.value))
  });
  const conditionItem = (option: FilterOption): MenuItem => ({
    icon: option.icon,
    label: option.label,
    selected: getConditionValue(props.filter) === option.value,
    closeOnSelect: false,
    onClick: () => props.update(getConditionUpdate(props.filter, option.value))
  });
  const menuItems = (): Array<Array<MenuItem | (() => JSX.Element)>> => {
    const propertyType = getPropertyTypeOption(props.filter.kind);
    const condition = getConditionOption(props.filter);
    const items: Array<Array<MenuItem | (() => JSX.Element)>> = [
      [
        () => (
          <PropertyFilterName
            name={props.filter.name}
            setName={(name, key) => props.update({ key, name })}
          />
        )
      ],
      [
        {
          icon: propertyType.icon,
          label: `Type: ${propertyType.label}`,
          items: PROPERTY_TYPE_OPTIONS.map(typeItem)
        }
      ],
      [
        {
          icon: condition.icon,
          label: `Condition: ${condition.label}`,
          items: getConditionOptions(props.filter).map(conditionItem)
        }
      ]
    ];

    if (props.filter.kind !== "boolean") {
      items.push([() => <FilterValue filter={props.filter} update={props.update} />]);
    }

    items.push(props.actions);

    return items;
  };

  return (
    <DropdownMenu
      title={props.title}
      items={menuItems()}
      opened={props.opened}
      setOpened={props.setOpened}
      disabled={props.disabled}
      placement={props.placement}
      cardProps={{ class: "![&>div]:overflow-visible md:max-w-64" }}
      portal={false}
      positioningStrategy="absolute"
      trigger={props.trigger}
    />
  );
};
const NewPropertyFilterMenu: Component<NewPropertyFilterMenuProps> = (props) => {
  const [filter, setFilter] = createSignal(createPropertyFilterDraft(0));
  const update = (update: Partial<PropertyFilterDraft>) => {
    setFilter((currentFilter) => ({ ...currentFilter, ...update }));
  };
  const valid = () => Boolean(filter().name.trim() && getSearchPropertyFilter(filter()));

  createEffect(() => {
    if (!props.opened) setFilter(createPropertyFilterDraft(0));
  });

  return (
    <FilterConfigurationMenu
      title="Add property filter"
      filter={filter()}
      update={update}
      actions={[
        () => (
          <div class="p-1 pb-1.5 md:pb-1">
            <Button
              type="button"
              class={clsx(
                "w-full justify-center md:py-0.5",
                !valid() && "!cursor-default opacity-70"
              )}
              variant="outlined"
              color="primary"
              size="small"
              aria-disabled={!valid()}
              onClick={() => {
                if (valid()) props.add(filter());
              }}
            >
              Add filter
            </Button>
          </div>
        )
      ]}
      opened={props.opened}
      setOpened={props.setOpened}
      disabled={props.disabled}
      placement="bottom-end"
      trigger={() => (
        <Tooltip content="Add property filter">
          <IconButton
            type="button"
            variant="text"
            icon="i-lucide:list-filter-plus"
            text="soft"
            size="small"
            disabled={props.disabled}
            aria-label="Add property filter"
          />
        </Tooltip>
      )}
    />
  );
};
const PropertyFilterMenu: Component<FilterMenuProps> = (props) => {
  const condition = () => getConditionOption(props.filter);

  return (
    <FilterConfigurationMenu
      title="Property filter"
      filter={props.filter}
      update={props.update}
      actions={[
        {
          icon: "i-lucide:trash-2",
          label: "Delete filter",
          color: "danger",
          onClick: props.remove
        }
      ]}
      opened={props.opened}
      setOpened={props.setOpened}
      placement="bottom-start"
      trigger={() => (
        <Button
          variant="outlined"
          color="contrast"
          size="small"
          class="flex max-w-64 items-center p-0.5 pl-1.5 pr-0.5 gap-1"
          aria-label={`Edit filter: ${getFilterSummary(props.filter)}`}
          badge
        >
          <span class="min-w-0 truncate text-gray-500">{getFilterLabel(props.filter)}</span>
          <span
            class={clsx(
              "h-3.5 w-3.5 shrink-0 text-gray-300",
              typeof condition().icon === "string" && condition().icon
            )}
          >
            {typeof condition().icon === "function" && <Dynamic component={condition().icon} />}
          </span>
          <Show when={getFilterBadgeValue(props.filter)} keyed>
            {(value) => <span class="min-w-0 truncate">{value}</span>}
          </Show>
          <button
            class="inline-flex justify-center items-center h-5 w-5 shrink-0 rounded-md @hover:bg-red-500/10 group/filter"
            onClick={(event) => {
              event.stopPropagation();
              event.preventDefault();
              props.remove();
            }}
          >
            <span class="i-lucide:x h-4 w-4 text-gray-400 media-mouse:group-hover/filter:text-red-500" />
          </button>
        </Button>
      )}
    />
  );
};

export {
  getSearchPropertyFilter,
  NewPropertyFilterMenu,
  PROPERTY_TYPE_OPTIONS,
  PropertyFilterMenu
};
export type { PropertyFilterDraft, PropertyFilterKind };
