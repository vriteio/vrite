import { mdiChevronLeft, mdiChevronRight, mdiDotsHorizontal } from "@mdi/js";
import { Pagination, PageItem } from "@vrite/solid-ui";
import { Component, For, Show, createSignal } from "solid-js";
import { Button, Icon, IconButton } from "#components/primitives";

interface PaginationMenuProps {
  totalPages: number;
  page: number;
}

const PaginationMenu: Component<PaginationMenuProps> = (props) => {
  const [page, setPage] = createSignal(props.page);

  return (
    <Pagination.Root total={props.totalPages} value={page()} setValue={setPage} visiblePages={5}>
      <div class="w-full flex items-center justify-center mt-16 gap-16">
        <Pagination.Previous
          as={(props) => {
            return (
              <IconButton
                path={mdiChevronLeft}
                text="soft"
                variant="text"
                class="disabled:opacity-50"
                link={props.page ? `/blog/page/${props.page}` : undefined}
                disabled={props.disabled}
              />
            );
          }}
        />
        <div class="font-semibold text-gray-500 dark:text-gray-400 flex">
          <Pagination.Items>
            {(props) => {
              return (
                <For each={props.items}>
                  {(item) => {
                    return (
                      <Show
                        when={item.type === "page"}
                        fallback={
                          <Pagination.Separator>
                            <IconButton
                              path={mdiDotsHorizontal}
                              variant="text"
                              hover={false}
                              badge
                            />
                          </Pagination.Separator>
                        }
                      >
                        {(_) => {
                          const pageItem = (): PageItem => item as PageItem;

                          return (
                            <Pagination.Item
                              item={pageItem()}
                              as={(props) => {
                                return (
                                  <Button
                                    class="h-8 w-8 p-1 flex justify-center items-center"
                                    variant={pageItem().active ? "solid" : "text"}
                                    color={pageItem().active ? "primary" : "base"}
                                    link={`/blog/page/${pageItem().page}`}
                                    onClick={props.onClick}
                                  >
                                    {pageItem().page}
                                  </Button>
                                );
                              }}
                            ></Pagination.Item>
                          );
                        }}
                      </Show>
                    );
                  }}
                </For>
              );
            }}
          </Pagination.Items>
        </div>
        <Pagination.Next
          as={(props) => {
            return (
              <IconButton
                path={mdiChevronRight}
                text="soft"
                variant="text"
                class="disabled:opacity-50"
                link={props.page ? `/blog/page/${props.page}` : undefined}
                disabled={props.disabled}
              />
            );
          }}
        />
      </div>
    </Pagination.Root>
  );
};

export { PaginationMenu };
