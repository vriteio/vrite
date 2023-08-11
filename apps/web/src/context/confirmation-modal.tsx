import { mdiCheck, mdiClose, mdiTrashCan } from "@mdi/js";
import {
  JSX,
  createContext,
  ParentComponent,
  useContext,
  createSignal,
  Show,
  Switch,
  Match,
  createMemo
} from "solid-js";
import clsx from "clsx";
import { Card, Heading, IconButton, Input, Overlay } from "#components/primitives";

interface ConfirmationModalConfig {
  content?: JSX.Element;
  header: string;
  onCancel?(): void;
  onConfirm?(): void;
}
interface ConfirmationModalContextData {
  confirmDelete(config: ConfirmationModalConfig): void;
  confirmAction(config: ConfirmationModalConfig): void;
  confirmWithInput(config: ConfirmationModalConfig & { input: string }): void;
}

const ConfirmationModalContext = createContext<ConfirmationModalContextData>();
const ConfirmationModalProvider: ParentComponent = (props) => {
  const [config, setConfig] = createSignal<(ConfirmationModalConfig & { input?: string }) | null>();
  const [type, setType] = createSignal<"action" | "delete" | "input" | null>(null);
  const [input, setInput] = createSignal<string>("");
  const filled = createMemo(() => {
    return type() !== "input" || input() === config()?.input;
  });
  const confirmDelete = (config: ConfirmationModalConfig): void => {
    setType("delete");
    setConfig(config);
  };
  const confirmAction = (config: ConfirmationModalConfig): void => {
    setType("action");
    setConfig(config);
  };
  const confirmWithInput = (config: ConfirmationModalConfig & { input: string }): void => {
    setType("input");
    setConfig(config);
  };
  const cancel = (): void => {
    config()?.onCancel?.();
    setConfig();
  };

  return (
    <ConfirmationModalContext.Provider value={{ confirmDelete, confirmAction, confirmWithInput }}>
      {props.children}
      <Overlay opened={Boolean(config())} onOverlayClick={cancel}>
        <Show when={config()} keyed>
          {(config) => {
            return (
              <Card class="max-w-full p-3 w-88">
                <div class="flex items-start justify-center">
                  <Heading class="flex-1">{config.header}</Heading>
                  <IconButton
                    path={mdiClose}
                    class="m-0"
                    text="soft"
                    color="contrast"
                    onClick={cancel}
                  />
                </div>
                <div class={clsx("mt-2", type() === "input" ? "mb-4" : "mb-8")}>
                  {config.content}
                </div>
                <Show when={type() === "input"}>
                  <div class="mb-4">
                    <Input value={input()} setValue={setInput} class="m-0" color="contrast" />
                    <p class="text-sm">
                      Please type "<em>{config.input || ""}</em>" to confirm.
                    </p>
                  </div>
                </Show>
                <div class="flex items-center justify-center w-full gap-2">
                  <IconButton
                    class="flex-1 m-0"
                    path={mdiClose}
                    label="Cancel"
                    color="contrast"
                    text="soft"
                    onClick={cancel}
                  />
                  <Switch>
                    <Match when={type() === "delete" || type() === "input"}>
                      <IconButton
                        class="flex-1 m-0"
                        path={mdiTrashCan}
                        color="danger"
                        label="Delete"
                        disabled={!filled()}
                        onClick={() => {
                          config.onConfirm?.();
                          setConfig(null);
                        }}
                      />
                    </Match>
                    <Match when={type() === "action"}>
                      <IconButton
                        class="flex-1 text-white"
                        path={mdiCheck}
                        color="success"
                        label="Confirm"
                        onClick={() => {
                          config.onConfirm?.();
                          setConfig(null);
                        }}
                      />
                    </Match>
                  </Switch>
                </div>
              </Card>
            );
          }}
        </Show>
      </Overlay>
    </ConfirmationModalContext.Provider>
  );
};
const useConfirmationModal = (): ConfirmationModalContextData => {
  return useContext(ConfirmationModalContext)!;
};

export { ConfirmationModalProvider, useConfirmationModal };
