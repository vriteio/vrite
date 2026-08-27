import { createMutation } from "@tanstack/solid-query";
import { createContext, createSignal, type ParentComponent, useContext } from "solid-js";
import { ActionConfirmationDialog } from "#web/components/action-confirmation-dialog";
import { useNotify } from "#web/context/notifications";
import { useWorkspace } from "#web/context/workspace";

interface RestrictedActionTarget {
  id: string;
  label: string;
  restricted: boolean;
}
interface RestrictedActionsContextValue {
  open(target: RestrictedActionTarget): void;
}

const RestrictedActionsContext = createContext<RestrictedActionsContextValue>();
const RestrictedActionsProvider: ParentComponent = (props) => {
  const notify = useNotify();
  const { content } = useWorkspace();
  const [opened, setOpened] = createSignal(false);
  const [target, setTarget] = createSignal<RestrictedActionTarget>({
    id: "",
    label: "",
    restricted: false
  });
  const mutation = createMutation(() => ({
    mutationFn: async (input: RestrictedActionTarget) => {
      await content.collections.setRestricted({
        collectionID: input.id,
        restricted: !input.restricted
      });
    },
    onSuccess: (_data, input) => {
      setOpened(false);
      notify({
        type: "success",
        text: input.restricted ? "Access restriction removed" : "Collection restricted"
      });
    },
    onError: (error, input) => {
      console.error(error);
      notify({
        type: "error",
        text: input.restricted
          ? "Failed to remove access restriction"
          : "Failed to restrict collection"
      });
    }
  }));
  const open = (nextTarget: RestrictedActionTarget) => {
    setTarget(nextTarget);
    setOpened(true);
  };
  const close = () => {
    if (!mutation.isPending) setOpened(false);
  };
  const title = () => {
    return target().restricted ? "Remove access restriction?" : "Restrict collection access?";
  };
  const description = () => {
    if (target().restricted) {
      return "This collection will inherit a restriction from its parent, or become visible to all workspace members.";
    }

    return "Only admins and members with restricted collection access will be able to see this collection and its content.";
  };

  return (
    <RestrictedActionsContext.Provider value={{ open }}>
      {props.children}
      <ActionConfirmationDialog
        opened={opened()}
        title={title()}
        description={description()}
        affected={[
          {
            id: target().id,
            icon: "i-lucide:lock",
            label: target().label
          }
        ]}
        action={{
          color: target().restricted ? "danger" : "primary",
          icon: target().restricted ? "i-lucide:lock-open" : "i-lucide:lock",
          label: target().restricted ? "Remove restriction" : "Restrict access",
          loading: mutation.isPending,
          onClick: () => mutation.mutate(target())
        }}
        onClose={close}
      />
    </RestrictedActionsContext.Provider>
  );
};

const useRestrictedActions = () => useContext(RestrictedActionsContext)!;

export { RestrictedActionsProvider, useRestrictedActions };
export type { RestrictedActionTarget };
