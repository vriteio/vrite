import { Button, Card, Dropdown, IconButton, Input, Tooltip } from "#web/components/primitives";
import { Component, Show } from "solid-js";
import { Editor } from "@andesine/editor";
import { useParams } from "@solidjs/router";
import { useContent, useLayout, useNotify } from "#web/context";

const EditorPane: Component = () => {
  const { layout, setLayout } = useLayout();
  const [{ entries }] = useContent();
  const params = useParams();
  const notify = useNotify();
  const entry = () => entries[params.slug];

  return (
    <Card
      class="flex justify-center items-center flex-col flex-1 h-full p-0 overflow-hidden relative"
      shade
    >
      <div class="flex gap-2 p-2 pl-4 w-full items-center justify-center">
        {entry() ? (
          <>
            <span class="text-base font-medium inline-flex items-center justify-center leading-[1]">
              <Tooltip text="Workspace" fixed>
                <span class="i-lucide:hexagon h-5 w-5" />
              </Tooltip>
              <span class="text-gray-400 i-lucide:chevron-right h-4 w-4"></span>
              <span>{entry()?.name}</span>
            </span>
            <div class="flex-1" />
            <Dropdown
              activatorButton={() => (
                <Button variant="outlined" color="contrast" size="small">
                  Share
                </Button>
              )}
            >
              <div class="flex flex-col gap-2 p-2 min-w-80">
                <div class="flex gap-1">
                  <Input variant="outlined" color="contrast" size="small" placeholder="Email" />
                  <Button color="primary" size="small">
                    Share
                  </Button>
                </div>
                <div class="flex items-center">
                  <div class="flex-1" />
                  <Button
                    class="flex gap-1 items-center"
                    size="small"
                    variant="outlined"
                    color="contrast"
                  >
                    <div class="i-lucide:link" />
                    Copy link
                  </Button>
                </div>
              </div>
            </Dropdown>
          </>
        ) : (
          <div class="flex-1" />
        )}
        <Tooltip
          text={layout.rightSidePanelWidth === 0 ? "Open side panel" : "Close side panel"}
          class="-ml-1"
          side="left"
          fixed
        >
          <IconButton
            variant="text"
            icon={
              layout.rightSidePanelWidth === 0
                ? "i-lucide:panel-right-open"
                : "i-lucide:panel-right-close"
            }
            text="soft"
            size="small"
            onClick={() => {
              setLayout("rightSidePanelWidth", layout.rightSidePanelWidth === 0 ? 320 : 0);
            }}
          />
        </Tooltip>
      </div>
      <div class="flex flex-1 px-4 overflow-hidden w-full">
        <Show
          when={params.slug}
          fallback={
            <div class="flex flex-col items-center justify-center gap-2 h-full w-full">
              <div class="i-lucide:file-pen text-gray-200 h-12 w-12" />
              <span class="text-xs text-gray-300 dark:text-gray-600">
                Select an entry to start editing
              </span>
            </div>
          }
        >
          <Editor
            doc={params.slug}
            url={import.meta.env.PUBLIC_COLLAB_URL}
            notify={(type, text) => notify({ type, text })}
          />
        </Show>
      </div>
    </Card>
  );
};

export { EditorPane };
