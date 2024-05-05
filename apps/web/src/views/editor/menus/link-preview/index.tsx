import { Accessor, Component, createMemo, createResource, Show } from "solid-js";
import { mdiWeb, mdiFileDocumentOutline } from "@mdi/js";
import clsx from "clsx";
import { Instance } from "tippy.js";
import { App, useAuthenticatedUserData, useClient, useContentData } from "#context";
import { Card, Icon, IconButton, Loader } from "#components/primitives";

interface LinkPreviewMenuProps {
  link: Accessor<string>;
  tippyInstance: Accessor<Instance | undefined>;
}

const LinkPreviewMenu: Component<LinkPreviewMenuProps> = (props) => {
  const { activeVariantId } = useContentData();
  const { workspace } = useAuthenticatedUserData();
  const client = useClient();
  const updateTooltipPosition = (): void => {
    setTimeout(() => {
      props.tippyInstance()?.popperInstance?.update();
    }, 0);
  };
  const [previewData] = createResource<App.PreviewData | null, string>(props.link, async (link) => {
    if (!link) return null;

    try {
      const result = await client.utils.linkPreview.query({
        url: props.link(),
        variantId: activeVariantId() || undefined,
        workspaceId: workspace()?.id
      });

      updateTooltipPosition();

      return result;
    } catch (error) {
      updateTooltipPosition();

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
  const href = createMemo((): string => {
    const isInternal = previewData()?.type === "internal" || props.link().startsWith("/");

    return `${isInternal ? "/editor" : ""}${previewData()?.url || props.link()}`;
  });

  return (
    <div
      class={clsx(
        "flex items-start justify-center",
        (previewData()?.image || previewData()?.description) && "min-h-40 min-w-80"
      )}
    >
      <a
        href={href()}
        class="no-underline"
        {...(previewData()?.type === "internal" ? {} : { target: "_blank" })}
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
              <p class="mt-0 mb-2 text-sm px-2">{previewData()?.description}</p>
            </Show>
            <Show
              when={previewData()?.title}
              fallback={
                <IconButton
                  path={previewData()?.type === "internal" ? mdiFileDocumentOutline : mdiWeb}
                  badge
                  class="m-0"
                  text="soft"
                  label="Visit website"
                />
              }
            >
              <div class="flex items-start justify-start text-base">
                <Show
                  when={icon()}
                  fallback={
                    <Icon
                      path={previewData()?.type === "internal" ? mdiFileDocumentOutline : mdiWeb}
                      class="h-6 w-6"
                    />
                  }
                >
                  <img src={icon()} class="w-6 h-6 mr-1" />
                </Show>
                <div class="flex flex-col flex-1 justify-start items-start pl-1 text-left">
                  <span class="flex-1 text-start font-semibold clamp-1 break-all">
                    {previewData()?.title}
                  </span>
                  <span class="text-xs text-gray-500 dark:text-gray-400 font-mono clamp-1 break-all">
                    {previewData()?.url}
                  </span>
                </div>
              </div>
            </Show>
          </Show>
        </Card>
      </a>
    </div>
  );
};

export { LinkPreviewMenu };
