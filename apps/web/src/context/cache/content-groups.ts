import { Accessor, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";
import { useClientContext, App } from "#context/client";

interface UseContentGroups {
  contentGroups: Accessor<App.ContentGroup[]>;
  setContentGroups: (contentGroups: App.ContentGroup[]) => void;
}

const useContentGroups = (): UseContentGroups => {
  const { client } = useClientContext();
  const [state, setState] = createStore<{
    contentGroups: App.ContentGroup[];
  }>({
    contentGroups: []
  });
  const moveContentGroup = (contentGroupId: string, index: number): void => {
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

  client.contentGroups.list.query().then((contentGroups) => {
    setState("contentGroups", contentGroups);
  });

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
        case "move":
          moveContentGroup(data.id, data.index);
          break;
      }
    }
  });

  onCleanup(() => {
    contentGroupsChanges.unsubscribe();
  });

  return {
    contentGroups: () => state.contentGroups,
    setContentGroups: (contentGroups) => setState("contentGroups", contentGroups)
  };
};

export { useContentGroups };
export type { UseContentGroups };
