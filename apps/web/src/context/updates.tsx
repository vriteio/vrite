import { WorkspaceEvent, client } from "#web/lib/client";
import {
  createContext,
  createEffect,
  createSignal,
  onCleanup,
  ParentComponent,
  useContext
} from "solid-js";

const UpdatesContext = createContext<{
  registerUpdateHandler(handler: (event: WorkspaceEvent) => void): () => void;
}>();
const UpdatesProvider: ParentComponent = (props) => {
  const [updateHandlers, setUpdateHandlers] = createSignal<
    Array<(event: WorkspaceEvent) => boolean | void>
  >([]);

  /*createEffect(() => {
    const socket = client.updates.index.subscribe();
    const intervalHandle = setInterval(() => {
      socket.send({ action: "ping" });
    }, 1000);

    socket.subscribe((event) => {
      const handlers = updateHandlers();
      for (const handler of handlers) {
        const consumed = handler(event.data);

        if (consumed) {
          break;
        }
      }
    });

    onCleanup(() => {
      clearInterval(intervalHandle);
      socket.close();
    });
  });*/

  return (
    <UpdatesContext.Provider
      value={{
        registerUpdateHandler: (handler) => {
          setUpdateHandlers((handlers) => [...handlers, handler]);

          return () => {
            setUpdateHandlers((handlers) =>
              handlers.filter((filteredHandler) => filteredHandler !== handler)
            );
          };
        }
      }}
    >
      {props.children}
    </UpdatesContext.Provider>
  );
};
const useUpdates = () => {
  return useContext(UpdatesContext)!;
};

export { UpdatesProvider, useUpdates };
