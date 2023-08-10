import { Accessor, createSignal, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";
import { useClient, App } from "#context/client";

interface UseContentGroups {
  contentGroups: Accessor<App.ContentGroup[]>;
  loading: Accessor<boolean>;
  refetch(ancestorId?: string): Promise<void>;
  setContentGroups(contentGroups: App.ContentGroup[]): void;
}

const useContentGroups = (initialAncestorId?: string): UseContentGroups => {
  const [ancestorId, setAncestorId] = createSignal(initialAncestorId);
  const [loading, setLoading] = createSignal(false);
  const client = useClient();
  const [state, setState] = createStore<{
    contentGroups: App.ContentGroup[];
  }>({
    contentGroups: []
  });
  const reorderContentGroup = (contentGroupId: string, index: number): void => {
    const newContentGroups = [...state.contentGroups];
    const contentGroupIndex = newContentGroups.findIndex((contentGroup) => {
      return contentGroup.id === contentGroupId;
    });
    const [contentGroup] = newContentGroups.splice(contentGroupIndex, 1);

    newContentGroups.splice(index, 0, contentGroup);
    setState({
      contentGroups: newContentGroups
    });
  };
  const moveContentGroup = (contentGroup: App.ContentGroup): void => {
    const newContentGroups = [...state.contentGroups];
    const index = newContentGroups.findIndex((newContentGroup) => {
      return newContentGroup.id === contentGroup.id;
    });

    if (index >= 0 && contentGroup.ancestors.at(-1) !== ancestorId()) {
      newContentGroups.splice(index, 1);
    } else if (index < 0 && contentGroup.ancestors.at(-1) === ancestorId()) {
      newContentGroups.push(contentGroup);
    }

    setState({
      contentGroups: newContentGroups
    });
  };
  const refetch = async (ancestor?: string): Promise<void> => {
    setLoading(true);

    const contentGroups = await client.contentGroups.list.query({ ancestor });

    setAncestorId(ancestor);
    setState("contentGroups", contentGroups);
    setLoading(false);
  };
  const contentGroupsChanges = client.contentGroups.changes.subscribe(undefined, {
    onData({ action, data }) {
      switch (action) {
        case "create":
          if (data.ancestors[data.ancestors.length - 1] === ancestorId()) {
            setState({ contentGroups: [...state.contentGroups, data] });
          }

          break;
        case "update":
          setState(
            "contentGroups",
            state.contentGroups.findIndex((column) => column.id === data.id),
            (contentGroup) => ({ ...contentGroup, ...data })
          );
          break;
        case "delete":
          setState({
            contentGroups: state.contentGroups.filter((column) => column.id !== data.id)
          });
          break;
        case "reorder":
          reorderContentGroup(data.id, data.index);
          break;
        case "move":
          moveContentGroup(data);

          break;
      }
    }
  });

  onCleanup(() => {
    contentGroupsChanges.unsubscribe();
  });
  refetch(ancestorId());

  return {
    refetch,
    loading,
    contentGroups: () => state.contentGroups,
    setContentGroups: (contentGroups) => setState("contentGroups", contentGroups)
  };
};

export { useContentGroups };
export type { UseContentGroups };
