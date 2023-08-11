import { Accessor, Component, createMemo, createResource, Show } from "solid-js";
import { mdiWeb } from "@mdi/js";
import clsx from "clsx";
import { App, useClient } from "#context";
import { Card, Icon, IconButton, Loader } from "#components/primitives";

interface LinkPreviewMenuProps {
  link: Accessor<string>;
}

const LinkPreviewMenu: Component<LinkPreviewMenuProps> = (props) => {
  const client = useClient();
  const [previewData] = createResource<App.PreviewData | null, string>(props.link, async (link) => {
    if (!link) return null;

    try {
      return await client.utils.openGraph.query({ url: props.link() });
    } catch (error) {
      return null;
    }
  });
  const icon = createMemo((): string => {
    const data = previewData();

    if (!data) {
      return "";
    }

    if (data.icon?.startsWith("/")) {
      return `${new URL(data.url || "").origin}${data.icon}`;
    }

    return data.icon || "";
  });

  return (
    <div
      class={clsx(
        "flex items-start justify-center",
        (previewData()?.image || previewData()?.description) && "min-h-40 min-w-80"
      )}
    >
      <Card
        class={clsx(
          previewData.loading && "flex justify-center items-center text-primary h-40 w-80",
          "overflow-hidden"
        )}
      >
        <Show when={!previewData.loading} fallback={<Loader class="w-8 h-8" />}>
          <Show when={previewData()?.image}>
            <div class="flex items-center justify-center mb-2 overflow-hidden shadow-lg rounded-2xl">
              <img src={previewData()?.image} class=" max-h-48" />
            </div>
          </Show>
          <Show when={previewData()?.description}>
            <p class="mt-0 mb-2 text-sm">{previewData()?.description}</p>
          </Show>
          <Show
            when={previewData()?.title}
            fallback={
              <a href={previewData()?.url || props.link()} target="_blank" class="no-underline">
                <IconButton path={mdiWeb} badge class="m-0" text="soft" label="Visit website" />
              </a>
            }
          >
            <div class="flex items-center justify-start gap-2 text-sm">
              <Show when={icon()} fallback={<Icon path={mdiWeb} class="text-gray-700 h-7 w-7" />}>
                <img src={icon()} class="w-7 h-7" />
              </Show>
              <div class="flex flex-col text-xs overflow-hidden">
                <span class="clamp-1">{previewData()?.title}</span>
                <a href={previewData()?.url || props.link()} target="_blank" class="clamp-1">
                  {previewData()?.url}
                </a>
              </div>
            </div>
          </Show>
        </Show>
      </Card>
    </div>
  );
};

export { LinkPreviewMenu };
