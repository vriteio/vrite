import {
  mdiClipboardOutline,
  mdiClose,
  mdiCodeJson,
  mdiDownloadCircleOutline,
  mdiExportVariant,
  mdiLanguageHtml5,
  mdiLanguageMarkdown
} from "@mdi/js";
import { Component, createSignal } from "solid-js";
import { gfmOutputTransformer, htmlOutputTransformer } from "@vrite/sdk/transformers";
import { JSONContent } from "@vrite/sdk";
import { nanoid } from "nanoid";
import clsx from "clsx";
import { Card, Dropdown, Heading, IconButton, Overlay, Tooltip } from "#components/primitives";
import { MiniCodeEditor } from "#components/fragments";
import {
  App,
  useAuthenticatedUserData,
  useClient,
  useCommandPalette,
  useNotifications,
  useSharedState
} from "#context";
import { formatCode } from "#lib/code-editor";
import { escapeHTML } from "#lib/utils";
import { mdxIcon } from "#assets/icons";

interface ExportMenuProps {
  editedContentPiece?: App.ContentPieceWithAdditionalData;
  content?: JSONContent;
  wrapperClass?: string;
  class?: string;
  onClick?(): void;
}

type ExportType = "html" | "json" | "md" | "mdx";

const ExportMenu: Component<ExportMenuProps> = (props) => {
  const { useSharedSignal } = useSharedState();
  const client = useClient();
  const [editor] = useSharedSignal("editor");
  const { registerCommand = () => {} } = useCommandPalette() || {};
  const { workspaceSettings = () => null } = useAuthenticatedUserData() || {};
  const { notify } = useNotifications();
  const [loading, setLoading] = createSignal(false);
  const [exportMenuOpened, setExportMenuOpened] = createSignal(false);
  const [exportDropdownOpened, setExportDropdownOpened] = createSignal(false);
  const [code, setCode] = createSignal("");
  const [exportType, setExportType] = createSignal<ExportType>("html");
  const loadContent = async (type: ExportType): Promise<string | undefined> => {
    try {
      let { content } = props;

      if (!content && props.editedContentPiece) {
        content = (editor()?.getJSON() as JSONContent) || { type: "doc", content: [] };
      }

      const prettierConfig = JSON.parse(workspaceSettings()?.prettierConfig || "{}");

      if (!content) return;

      if (type === "html") {
        return formatCode(
          htmlOutputTransformer(content).replace(/<code>((?:.|\n)+?)<\/code>/g, (_, code) => {
            return `<code>${escapeHTML(code)}</code>`;
          }),
          "html",
          prettierConfig
        );
      }

      if (type === "md") {
        return formatCode(gfmOutputTransformer(content), "markdown", prettierConfig);
      }

      if (type === "mdx") {
        try {
          const response = await fetch("https://extensions.vrite.io/mdx/output", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              data: [
                {
                  content,
                  metadata: props.editedContentPiece || {}
                }
              ]
            })
          });
          const [result] = await response.json();

          return result;
        } catch (error) {
          return;
        }
      }

      return formatCode(JSON.stringify(content), "json", prettierConfig);
    } catch (e) {
      notify({ type: "error", text: "Couldn't export the content" });
      setLoading(false);
    }
  };
  const exportContent = async (type: ExportType): Promise<void> => {
    setExportDropdownOpened(false);
    setLoading(true);

    const loadingCode = loadContent(type);

    setLoading(false);
    notify({
      type: "loading",
      text: "Exporting the content",
      promise: loadingCode
    });

    const code = await loadingCode;

    setExportType(type);
    setCode(code || "");
    setExportMenuOpened(true);
  };

  registerCommand([
    {
      category: "editor",
      icon: mdiLanguageHtml5,
      name: "Export HTML",
      action() {
        exportContent("html");
      }
    },
    {
      category: "editor",
      icon: mdiCodeJson,
      name: "Export JSON",
      action() {
        exportContent("json");
      }
    },
    {
      category: "editor",
      icon: mdiLanguageMarkdown,
      name: "Export GFM",
      action() {
        exportContent("md");
      }
    },
    {
      category: "editor",
      icon: mdxIcon,
      name: "Export MDX",
      action() {
        exportContent("mdx");
      }
    }
  ]);

  return (
    <>
      <Dropdown
        activatorWrapperClass="w-full"
        activatorButton={() => (
          <IconButton
            path={mdiExportVariant}
            label="Export"
            text="soft"
            class={clsx("m-0", props.class)}
            onClick={props.onClick}
            variant="text"
            id="content-piece-export"
          />
        )}
        class={props.wrapperClass}
        opened={exportDropdownOpened()}
        setOpened={setExportDropdownOpened}
        placement="bottom-start"
        cardProps={{ class: "mt-3" }}
        fixed
      >
        <div class="gap-1 flex flex-col">
          <IconButton
            path={mdiLanguageHtml5}
            text="soft"
            variant="text"
            label="HTML"
            disabled={loading()}
            class="justify-start w-full m-0"
            onClick={() => exportContent("html")}
          />
          <IconButton
            path={mdiCodeJson}
            text="soft"
            variant="text"
            label="JSON"
            disabled={loading()}
            class="justify-start w-full m-0"
            onClick={() => exportContent("json")}
          />
          <IconButton
            path={mdiLanguageMarkdown}
            text="soft"
            variant="text"
            label="GFM"
            disabled={loading()}
            class="justify-start w-full m-0"
            onClick={() => exportContent("md")}
          />
          <IconButton
            path={mdxIcon}
            text="soft"
            variant="text"
            label="MDX"
            disabled={loading()}
            class="justify-start w-full m-0"
            onClick={() => exportContent("mdx")}
          />
        </div>
      </Dropdown>
      <Overlay
        opened={exportMenuOpened()}
        onOverlayClick={() => {
          setExportMenuOpened(false);
        }}
        portal
      >
        <Card
          class="h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] md:w-[calc(100vw-8rem)] md:h-[calc(100dvh-8rem)] md:p-4 flex flex-col"
          color="contrast"
        >
          <div class="flex items-center justify-center">
            <Heading class="flex-1">
              {exportType() === "html" && "HTML "}
              {exportType() === "json" && "JSON "}
              {exportType() === "md" && "Markdown "}Export
            </Heading>
            <IconButton
              path={mdiClose}
              text="soft"
              onClick={() => {
                setExportMenuOpened(false);
              }}
            />
          </div>
          <div class="relative flex-1 max-h-[calc(100%-2rem)]">
            <MiniCodeEditor
              language={exportType()}
              wrap={true}
              fileName={`export.${exportType()}`}
              code={code()}
              wrapperClass="h-full"
              class="h-full"
              setHeight={false}
              readOnly
            />
            <div class="absolute flex justify-start m-0 bottom-2 right-2">
              <IconButton
                path={mdiDownloadCircleOutline}
                class="m-0"
                text="base"
                color="primary"
                variant="text"
                label="Download"
                onClick={() => {
                  let mimeType = exportType() === "html" ? "text/html" : "application/json";

                  if (exportType() === "md") {
                    mimeType = "text/markdown";
                  }

                  const a = document.createElement("a");
                  const file = new Blob([code()], {
                    type: mimeType
                  });

                  a.href = URL.createObjectURL(file);
                  a.download = `${props.editedContentPiece?.id || nanoid()}.${exportType()}`;
                  a.click();
                }}
              />
              <div class="h-8 pl-1 mr-1 border-r-2 border-gray-500 dark:border-gray-400" />
              <Tooltip text="Copy" class="mt-1">
                <IconButton
                  path={mdiClipboardOutline}
                  class="m-0"
                  variant="text"
                  text="soft"
                  onClick={async () => {
                    await window.navigator.clipboard.writeText(code());
                    notify({
                      text: `Copied!`,
                      type: "success"
                    });
                  }}
                />
              </Tooltip>
            </div>
          </div>
        </Card>
      </Overlay>
    </>
  );
};

export { ExportMenu };
