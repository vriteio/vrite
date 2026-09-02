import { type Component, createSignal, For, Show } from "solid-js";
import type { SearchPropertyFilter } from "#web/lib/data";
import {
  getSearchPropertyFilter,
  NewPropertyFilterMenu,
  PropertyFilterMenu,
  type PropertyFilterDraft
} from "./property-filter-menu";

interface SearchFiltersProps {
  filters: PropertyFilterDraft[];
  setFilters(filters: PropertyFilterDraft[]): void;
}

const MAX_FILTERS = 20;
const getSearchPropertyFilters = (drafts: PropertyFilterDraft[]): SearchPropertyFilter[] => {
  return drafts.flatMap((draft) => {
    const filter = getSearchPropertyFilter(draft);

    return filter ? [filter] : [];
  });
};

const AddSearchFilter: Component<SearchFiltersProps> = (props) => {
  const [addFilterOpened, setAddFilterOpened] = createSignal(false);
  const addFilter = (filter: PropertyFilterDraft) => {
    const nextID = Math.max(0, ...props.filters.map(({ id }) => id)) + 1;

    props.setFilters([...props.filters, { ...filter, id: nextID }]);
    setAddFilterOpened(false);
  };

  return (
    <NewPropertyFilterMenu
      add={addFilter}
      opened={addFilterOpened()}
      setOpened={setAddFilterOpened}
      disabled={props.filters.length >= MAX_FILTERS}
    />
  );
};
const SearchFilters: Component<SearchFiltersProps> = (props) => {
  const [openedFilterID, setOpenedFilterID] = createSignal<number | null>(null);
  const updateFilter = (id: number, update: Partial<PropertyFilterDraft>) => {
    props.setFilters(
      props.filters.map((filter) => (filter.id === id ? { ...filter, ...update } : filter))
    );
  };
  const removeFilter = (id: number) => {
    props.setFilters(props.filters.filter((filter) => filter.id !== id));
    setOpenedFilterID(null);
  };
  const setFilterOpened = (id: number, opened: boolean) => {
    setOpenedFilterID((currentID) => {
      if (opened) return id;

      return currentID === id ? null : currentID;
    });
  };

  return (
    <Show when={props.filters.length > 0}>
      <div class="flex shrink-0 flex-wrap items-center gap-1 px-1">
        <For each={props.filters}>
          {(filter) => (
            <PropertyFilterMenu
              filter={filter}
              opened={openedFilterID() === filter.id}
              setOpened={(opened) => setFilterOpened(filter.id, opened)}
              update={(update) => updateFilter(filter.id, update)}
              remove={() => removeFilter(filter.id)}
            />
          )}
        </For>
      </div>
    </Show>
  );
};

export { AddSearchFilter, SearchFilters, getSearchPropertyFilters };
export type { PropertyFilterDraft };
