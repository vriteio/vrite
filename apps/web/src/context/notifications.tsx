import {
  Component,
  createSignal,
  ParentComponent,
  Show,
  useContext,
  createContext
} from "solid-js";
import { mdiAlertCircle, mdiCheckCircle } from "@mdi/js";
import clsx from "clsx";
import { Presence, Motion } from "@motionone/solid";
import { createRef } from "#lib/utils";
import { Card, Icon, Button, Loader } from "#components/primitives";

interface NotificationData {
  type: "success" | "error" | "loading";
  text: string;
  promise?: Promise<any>;
}
interface NotificationProps extends NotificationData {
  onDismiss?(): void;
}
interface NotificationsContextData {
  notify(notification: NotificationData): void;
}

const Notification: Component<NotificationProps> = (props) => {
  return (
    <Card class="flex p-2 justify-center items-center shadow-lg">
      <Show when={props.type !== "loading"} fallback={<Loader class="h-6 w-6" color="primary" />}>
        <Icon
          path={props.type === "error" ? mdiAlertCircle : mdiCheckCircle}
          class={clsx("h-6 w-6", props.type === "success" ? "text-green-500" : "text-red-500")}
        />
      </Show>
      <span class="pl-2 pr-6 min-w-48">{props.text}</span>
      <Button size="small" variant="text" text="soft" onClick={() => props.onDismiss?.()}>
        Close
      </Button>
    </Card>
  );
};
const NotificationsContext = createContext<NotificationsContextData>();
const NotificationsProvider: ParentComponent = (props) => {
  const [notification, setNotification] = createSignal<NotificationData | null>(null);
  const [timeoutHandleRef, setTimeoutHandleRef] = createRef<number>(0);

  return (
    <NotificationsContext.Provider
      value={{
        notify(notification) {
          setNotification(notification);
          clearTimeout(timeoutHandleRef() || 0);

          if (notification.promise) {
            notification.promise.finally(() => setNotification(null));
          } else {
            setTimeoutHandleRef(
              window.setTimeout(() => {
                setNotification(null);
              }, 5000)
            );
          }
        }
      }}
    >
      {props.children}
      <div class="fixed z-50 bottom-4 right-4">
        <Presence exitBeforeEnter>
          <Show when={notification()} keyed>
            {(notification) => (
              <Motion
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.05 } }}
                transition={{ duration: 0.25, easing: "ease-out" }}
                exit={{ opacity: 0, y: -50 }}
              >
                <Notification onDismiss={() => setNotification(null)} {...notification} />
              </Motion>
            )}
          </Show>
        </Presence>
      </div>
    </NotificationsContext.Provider>
  );
};
const useNotificationsContext = (): NotificationsContextData => {
  return useContext(NotificationsContext)!;
};

export { NotificationsProvider, useNotificationsContext };
