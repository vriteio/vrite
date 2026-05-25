import {
  Component,
  createSignal,
  ParentComponent,
  Show,
  useContext,
  createContext,
  For,
  createEffect
} from "solid-js";
import clsx from "clsx";
import { createRef } from "#web/lib/ref";
import { Card, Button, Loader } from "#web/components/primitives";
import { createListTransition } from "@solid-primitives/transition-group";
import { resolveElements } from "@solid-primitives/refs";
import { animate } from "motion";

// TODO: Fix broken animations
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
        <Show when={props.type !== "loading"} fallback={<Loader class="h-6 w-6" color="primary" />}>
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
  const [expanded, setExpanded] = createSignal(false);
  const [timeoutHandleRef, setTimeoutHandleRef] = createRef<number>(0);
  const resolved = resolveElements(() => (
    <For each={notifications()}>
      {(notification, index) => {
        return (
          <div
            class="absolute right-0 w-full"
            data-index={index()}
            style={{
              "z-index": `${-index()}`
            }}
          >
            <Notification
              showContent={index() === 0}
              onDismiss={() =>
                setNotifications((notifications) => {
                  return notifications.filter((_, filteredIndex) => {
                    return filteredIndex !== index();
                  });
                })
              }
              {...notification}
            />
          </div>
        );
      }}
    </For>
  ));
  const transition = createListTransition(resolved.toArray, {
    appear: true,
    onChange({ added, unchanged, removed, finishRemoved }) {
      added.forEach((element) => {
        const index = () => Number(element.getAttribute("data-index"));

        queueMicrotask(() => {
          animate(
            element,
            { opacity: [0, 1 - index() * 0.1], y: [40, index() * 8] },
            { duration: 0.25, delay: 0.05 }
          );
        });
      });
      unchanged.forEach((element) => {
        const index = () => Number(element.getAttribute("data-index"));

        queueMicrotask(() => {
          if (index() > 2) {
            animate(element, { opacity: 0 }, { duration: 0.15 });
          } else {
            animate(
              element,
              { opacity: 1 - index() * 0.05, y: index() * 8, scale: 1 - index() * 0.05 },
              { duration: 0.15 }
            );
          }
        });
      });
      removed.forEach((element) => {
        animate(
          element,
          { opacity: 0, y: -20 },
          { duration: 0.25, opacity: { duration: 0.15 } }
        ).then(() => finishRemoved([element]));
      });
    }
  });

  createEffect(() => {
    if (expanded()) {
      const elements = resolved.toArray();
      let currentY = 0;
      elements.forEach((element) => {
        const index = () => Number(element.getAttribute("data-index"));

        animate(element, { opacity: 1, y: currentY, scale: 1 }, { duration: 0.15 });
        currentY -= element.getBoundingClientRect().height + 8;
      });
    } else {
      const elements = resolved.toArray();

      elements.forEach((element) => {
        const index = () => Number(element.getAttribute("data-index"));

        animate(
          element,
          { opacity: 1 - index() * 0.05, y: index() * 8, scale: 1 - index() * 0.05 },
          { duration: 0.15, ease: "easeOut" }
        );
      });
    }
  });

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
            setTimeoutHandleRef(
              window.setTimeout(() => {
                setNotifications((notifications) => {
                  return notifications.filter(
                    (filteredNotification) => filteredNotification !== notification
                  );
                });
              }, 3000)
            );
          }
        }
      }}
    >
      {props.children}
      <div
        class="fixed w-92 max-w-full flex flex-col-reverse z-60 bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] left-6 md:left-unset md:bottom-6 md:right-6 w-[calc(100%-2rem)]"
        onPointerEnter={() => {
          setExpanded(true);
        }}
        onPointerLeave={() => {
          setExpanded(false);
        }}
      >
        {transition()}
      </div>
    </NotificationsContext.Provider>
  );
};
const useNotify = (): NotificationsContextData["notify"] => {
  return useContext(NotificationsContext)!.notify;
};

export { NotificationsProvider, useNotify };
