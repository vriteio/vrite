import { Accessor, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";
import { useClientContext, App } from "#context/client";

interface UseContentGroups {
  contentGroups: Accessor<App.ContentGroup[]>;
  refetch(ancestorId?: string): Promise<void>;
  setContentGroups(contentGroups: App.ContentGroup[]): void;
}

const useContentGroups = (): UseContentGroups => {
  const { client } = useClientContext();
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
  const refetch = async (ancestorId?: string): Promise<void> => {
    const contentGroups = await client.contentGroups.list.query({ ancestorId });

    setState("contentGroups", contentGroups);
  };
  const contentGroupsChanges = client.contentGroups.changes.subscribe(undefined, {
    onData({ action, data }) {
      switch (action) {
        case "create":
          setState({ contentGroups: [...state.contentGroups, data] });
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
      }
    }
  });

  onCleanup(() => {
    contentGroupsChanges.unsubscribe();
  });
  refetch();

  return {
    refetch,
    contentGroups: () => state.contentGroups,
    setContentGroups: (contentGroups) => setState("contentGroups", contentGroups)
  };
};

export { useContentGroups };
export type { UseContentGroups };
