import {
  type Component,
  createSignal,
  type ParentComponent,
  Show,
  useContext,
  createContext,
  For,
  createMemo,
  onCleanup,
  onMount
} from "solid-js";
import clsx from "clsx";
import { Card, Button, Spinner } from "@andesine/components";

interface NotificationData {
  type: "success" | "error" | "info" | "loading";
  text: string;
  promise?: Promise<unknown>;
}
interface NotificationProps extends NotificationData {
  onDismiss?(): void;
}
interface ActiveNotification extends NotificationData {
  id: number;
}
interface NotificationsContextData {
  notify(notification: NotificationData): void;
}

const Notification: Component<NotificationProps> = (props) => (
  <Card
    color="contrast"
    class="flex p-0 justify-center items-center w-full rounded-xl transition-shadow duration-250 shadow-lg"
  >
    <div class="flex w-full p-2 rounded-xl shadow-inner shadow-gray-200 shadow-opacity-60">
      <Show when={props.type !== "loading"} fallback={<Spinner class="h-6 w-6" color="primary" />}>
        <div
          class={clsx(
            "h-6 w-6",
            props.type === "success" && "text-green-500 i-lucide:circle-check",
            props.type === "error" && "text-red-500 i-lucide:circle-alert",
            props.type === "info" && "text-blue-500 i-lucide:info"
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
const NotificationsContext = createContext<NotificationsContextData>();
const NotificationsProvider: ParentComponent = (props) => {
  const [notifications, setNotifications] = createSignal<ActiveNotification[]>([]);
  const [enteringIds, setEnteringIds] = createSignal(new Set<number>());
  const [dismissingIds, setDismissingIds] = createSignal(new Set<number>());
  const [hovered, setHovered] = createSignal(false);
  const [focused, setFocused] = createSignal(false);
  const [layoutVersion, setLayoutVersion] = createSignal(0);
  const notificationElements = new Map<number, HTMLDivElement>();
  const notificationTimers = new Map<number, number>();
  const removalTimers = new Map<number, number>();
  const animationFrames = new Set<number>();
  let nextNotificationId = 0;
  let container: HTMLDivElement | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let disposed = false;

  const expanded = createMemo(() => hovered() || focused());
  const getHeight = (notification: ActiveNotification): number => {
    layoutVersion();

    return notificationElements.get(notification.id)?.offsetHeight ?? 48;
  };
  const getBottomOffset = (index: number): number => {
    if (!expanded()) return Math.min(index, 2) * 8;

    return notifications()
      .slice(0, index)
      .reduce((offset, notification) => offset + getHeight(notification) + 8, 0);
  };
  const stackHeight = createMemo(() => {
    const activeNotifications = notifications();

    if (activeNotifications.length === 0) return 0;
    if (expanded()) {
      return activeNotifications.reduce(
        (height, notification, index) => height + getHeight(notification) + (index === 0 ? 0 : 8),
        0
      );
    }

    return (
      Math.max(...activeNotifications.map((notification) => getHeight(notification))) +
      Math.min(activeNotifications.length - 1, 2) * 8
    );
  });
  const dismiss = (id: number): void => {
    if (disposed || dismissingIds().has(id)) return;

    const notificationTimer = notificationTimers.get(id);

    if (notificationTimer !== undefined) window.clearTimeout(notificationTimer);
    notificationTimers.delete(id);
    setDismissingIds((ids) => new Set(ids).add(id));
    removalTimers.set(
      id,
      window.setTimeout(() => {
        setNotifications((notifications) => {
          return notifications.filter((notification) => notification.id !== id);
        });
        setDismissingIds((ids) => {
          const updatedIds = new Set(ids);

          updatedIds.delete(id);

          return updatedIds;
        });
        removalTimers.delete(id);
      }, 200)
    );
  };

  onMount(() => {
    resizeObserver = new ResizeObserver(() => {
      setLayoutVersion((version) => version + 1);
    });
    notificationElements.forEach((element) => resizeObserver?.observe(element));
  });
  onCleanup(() => {
    disposed = true;
    resizeObserver?.disconnect();
    notificationTimers.forEach((timer) => window.clearTimeout(timer));
    removalTimers.forEach((timer) => window.clearTimeout(timer));
    animationFrames.forEach((frame) => window.cancelAnimationFrame(frame));
  });

  return (
    <NotificationsContext.Provider
      value={{
        notify(notification) {
          const activeNotification = {
            ...notification,
            id: nextNotificationId++
          };

          setEnteringIds((ids) => new Set(ids).add(activeNotification.id));
          setNotifications((notifications) => [activeNotification, ...notifications]);
          const firstFrame = window.requestAnimationFrame(() => {
            animationFrames.delete(firstFrame);
            const secondFrame = window.requestAnimationFrame(() => {
              animationFrames.delete(secondFrame);
              setEnteringIds((ids) => {
                const updatedIds = new Set(ids);

                updatedIds.delete(activeNotification.id);

                return updatedIds;
              });
            });
            animationFrames.add(secondFrame);
          });
          animationFrames.add(firstFrame);

          if (notification.promise) {
            void notification.promise.then(
              () => dismiss(activeNotification.id),
              () => dismiss(activeNotification.id)
            );
          } else {
            notificationTimers.set(
              activeNotification.id,
              window.setTimeout(() => dismiss(activeNotification.id), 3000)
            );
          }
        }
      }}
    >
      {props.children}
      <div
        ref={container}
        class="fixed left-4 right-4 top-[calc(1rem+env(safe-area-inset-top,0px))] z-60 w-auto transition-[height] duration-200 md:bottom-6 md:left-auto md:right-6 md:top-auto md:w-92"
        style={{ height: `${stackHeight()}px` }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusIn={() => setFocused(true)}
        onFocusOut={(event) => {
          if (!container?.contains(event.relatedTarget as Node | null)) setFocused(false);
        }}
      >
        <For each={notifications()}>
          {(notification, index) => (
            <div
              ref={(element) => {
                notificationElements.set(notification.id, element);
                resizeObserver?.observe(element);
                onCleanup(() => {
                  resizeObserver?.unobserve(element);
                  notificationElements.delete(notification.id);
                });
              }}
              class="notification-stack-item absolute bottom-0 left-0 w-full transition-all duration-200"
              style={{
                "z-index": `${notifications().length - index()}`,
                "bottom": `${getBottomOffset(index())}px`,
                "opacity":
                  enteringIds().has(notification.id) || dismissingIds().has(notification.id)
                    ? "0"
                    : expanded() || index() < 3
                      ? "1"
                      : "0",
                "transform": [
                  (enteringIds().has(notification.id) || dismissingIds().has(notification.id)) &&
                    "var(--notification-enter-translation)",
                  `scale(${expanded() ? 1 : 1 - Math.min(index(), 2) * 0.04})`
                ]
                  .filter(Boolean)
                  .join(" ")
              }}
            >
              <Notification onDismiss={() => dismiss(notification.id)} {...notification} />
            </div>
          )}
        </For>
      </div>
    </NotificationsContext.Provider>
  );
};
const useNotify = (): NotificationsContextData["notify"] => {
  return useContext(NotificationsContext)?.notify ?? (() => {});
};

export { NotificationsProvider, useNotify };
