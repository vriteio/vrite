import {
  Component,
  createSignal,
  ParentComponent,
  Show,
  useContext,
  createContext,
  For
} from "solid-js";
import clsx from "clsx";
import { Card, Button, Spinner } from "@andesine/components";

interface NotificationData {
  type: "success" | "error" | "loading";
  text: string;
  promise?: Promise<any>;
}
interface NotificationProps extends NotificationData {
  showContent?: boolean;
  onDismiss?(): void;
}
interface NotificationsContextData {
  notify(notification: NotificationData): void;
}

const Notification: Component<NotificationProps> = (props) => {
  return (
    <Card
      color="contrast"
      class="flex p-0 justify-center items-center w-full rounded-xl transition-shadow duration-250 shadow-lg"
    >
      <div
        class={clsx(
          "flex w-full transition-opacity duration-250 p-2 rounded-xl shadow-inner shadow-gray-200 shadow-opacity-60",
          props.showContent === false && "opacity-0"
        )}
      >
        <Show
          when={props.type !== "loading"}
          fallback={<Spinner class="h-6 w-6" color="primary" />}
        >
          <div
            class={clsx(
              "h-6 w-6",
              props.type === "success" ? "text-green-500" : "text-red-500",
              props.type === "success" ? "i-lucide:circle-check" : "i-lucide:circle-alert"
            )}
          />
        </Show>
        <span class="px-2 min-w-48 flex-1">{props.text}</span>
        <Button
          size="small"
          variant="text"
          text="soft"
          onClick={() => props.onDismiss?.()}
          class="py-0"
        >
          Close
        </Button>
      </div>
    </Card>
  );
};
const NotificationsContext = createContext<NotificationsContextData>();
const NotificationsProvider: ParentComponent = (props) => {
  const [notifications, setNotifications] = createSignal<NotificationData[]>([]);

  return (
    <NotificationsContext.Provider
      value={{
        notify(notification) {
          setNotifications((notifications) => [notification, ...notifications.slice(0, 2)]);

          if (notification.promise) {
            notification.promise.finally(() => {
              setNotifications((notifications) => {
                return notifications.filter(
                  (filteredNotification) => filteredNotification !== notification
                );
              });
            });
          } else {
            window.setTimeout(() => {
              setNotifications((notifications) => {
                return notifications.filter(
                  (filteredNotification) => filteredNotification !== notification
                );
              });
            }, 3000);
          }
        }
      }}
    >
      {props.children}
      <div class="fixed w-92 max-w-full flex flex-col-reverse gap-2 z-60 bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] left-6 md:left-unset md:bottom-6 md:right-6 w-[calc(100%-2rem)]">
        <For each={notifications()}>
          {(notification, index) => {
            return (
              <div
                class="transition-all duration-200"
                style={{
                  opacity: `${Math.max(0.55, 1 - index() * 0.12)}`,
                  transform: `scale(${Math.max(0.92, 1 - index() * 0.04)})`
                }}
              >
                <Notification
                  showContent={index() === 0}
                  onDismiss={() =>
                    setNotifications((notifications) => {
                      return notifications.filter((_, filteredIndex) => filteredIndex !== index());
                    })
                  }
                  {...notification}
                />
              </div>
            );
          }}
        </For>
      </div>
    </NotificationsContext.Provider>
  );
};
const useNotify = (): NotificationsContextData["notify"] => {
  return useContext(NotificationsContext)?.notify ?? (() => {});
};

export { NotificationsProvider, useNotify };
