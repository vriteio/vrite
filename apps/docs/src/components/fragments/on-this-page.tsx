import {
  Component,
  For,
  onMount,
  onCleanup,
  createSignal,
  createMemo,
  createEffect,
  Show
} from "solid-js";
import { mdiListBox } from "@mdi/js";
import clsx from "clsx";
import { scroll } from "seamless-scroll-polyfill";
import { type TOCItem, TOC } from "@vrite/solid-ui";
import type { MarkdownHeading } from "astro";
import { Button, IconButton } from "#components/primitives";

interface OnThisPageProps {
  headings: MarkdownHeading[];
  hide?: boolean;
}

const OnThisPage: Component<OnThisPageProps> = (props) => {
  const items = createMemo(() => {
    const items: TOCItem[] = [];

    let parent: TOCItem[] | null = null;

    props.headings.forEach((heading) => {
      if (heading.depth === 2) {
        const children: TOCItem[] = [];

        items.push({
          label: heading.text,
          id: heading.slug,
          children
        });
        parent = children;
      } else if (heading.depth === 3) {
        parent?.push({
          label: heading.text,
          id: heading.slug
        });
      }
    });

    return items;
  });
  const handleClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;

    if (target.matches("h2, h3")) {
      const { id } = target;

      if (id) {
        history.replaceState(null, "", `#${id}`);
        navigator.clipboard.writeText(window.location.href);
      }
    }
  };

  onMount(() => {
    document.addEventListener("click", handleClick);
  });

  return (
    <>
      <div
        class={clsx(
          "w-64 flex-col justify-start top-0 pt-24 xl:fixed right-0 hidden xl:flex gap-2",
          "mr-[max(0px,calc((100%-(1536px))/2))]"
        )}
      >
        <Show when={props.hide !== true}>
          <Show when={items().length}>
            <IconButton
              text="soft"
              class="font-bold justify-start m-0"
              variant="text"
              badge
              hover={false}
              path={mdiListBox}
              label="On This Page"
            />
          </Show>
          <div class="flex flex-col">
            <TOC.Root items={items()} offset={80} getId={() => ""}>
              {(props) => {
                const isActive = (): boolean => props.isActive;
                const level = (): number => props.level;

                return (
                  <>
                    <TOC.Item
                      item={props.item}
                      as={(props) => {
                        return (
                          <Button
                            variant="text"
                            hover={false}
                            onClick={props.onClick}
                            class={clsx(
                              "text-start m-0 bg-gradient-to-tr text-transparent bg-clip-text from-gray-500 to-gray-500 dark:from-gray-400 dark:to-gray-400",
                              isActive() && "!from-orange-500 !to-red-500",
                              !isActive() &&
                                "hover:!from-gray-700 hover:!to-gray-700 dark:hover:!from-gray-200 dark:hover:!to-gray-200",
                              level() === 1 && "font-semibold"
                            )}
                          >
                            {props.children}
                          </Button>
                        );
                      }}
                    >
                      {props.item.label}
                    </TOC.Item>
                    <Show when={props.item.children?.length}>
                      <div class="ml-4 flex flex-col">{props.children}</div>
                    </Show>
                  </>
                );
              }}
            </TOC.Root>
          </div>
        </Show>
      </div>
      <div class="min-w-64 hidden xl:flex" />
    </>
  );
};

export { OnThisPage };
