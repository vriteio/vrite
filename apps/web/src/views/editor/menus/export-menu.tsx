import {
  mdiClipboardOutline,
  mdiClose,
  mdiCodeJson,
  mdiDownloadCircleOutline,
  mdiExportVariant,
  mdiLanguageHtml5
} from "@mdi/js";
import { Component, createSignal } from "solid-js";
import { htmlTransformer } from "@vrite/sdk/transformers";
import { Card, Dropdown, Heading, IconButton, Overlay, Tooltip } from "#components/primitives";
import { MiniCodeEditor } from "#components/fragments";
import { App, useAuthenticatedContext, useClientContext, useNotificationsContext } from "#context";
import { formatCode } from "#lib/code-editor";
import { escapeHTML } from "#lib/utils";

interface ExportMenuProps {
  editedContentPiece: App.ContentPieceWithTags;
}

const ExportMenu: Component<ExportMenuProps> = (props) => {
  const { client } = useClientContext();
  const { workspaceSettings } = useAuthenticatedContext();
  const { notify } = useNotificationsContext();
  const [loading, setLoading] = createSignal(false);
  const [exportMenuOpened, setExportMenuOpened] = createSignal(false);
  const [exportDropdownOpened, setExportDropdownOpened] = createSignal(false);
  const [code, setCode] = createSignal("");
  const [exportType, setExportType] = createSignal<"html" | "json">("html");
  const loadContent = async (type: "html" | "json"): Promise<string | undefined> => {
    try {
      const contentPiece = await client.contentPieces.get.query({
        content: true,
        id: props.editedContentPiece.id
      });
      const prettierConfig = JSON.parse(workspaceSettings()?.prettierConfig || "{}");

      if (type === "html") {
        if (!contentPiece.content) return;

        return formatCode(
          htmlTransformer(contentPiece.content as any).replace(
            /<code>((?:.|\n)+?)<\/code>/g,
            (_, code) => {
              return `<code>${escapeHTML(code)}</code>`;
            }
          ),
          "html",
          prettierConfig
        );
      }

      return formatCode(JSON.stringify(contentPiece.content), "json", prettierConfig);
    } catch (e) {
      notify({ type: "error", text: "Couldn't export the content" });
      setLoading(false);
    }
  };
  const exportContent = async (type: "html" | "json"): Promise<void> => {
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

  return (
    <>
      <div class="not-prose">
        <Dropdown
          activatorButton={() => (
            <IconButton
              path={mdiExportVariant}
              label="Export"
              text="soft"
              class="m-0"
              variant="text"
              id="content-piece-export"
            />
          )}
          opened={exportDropdownOpened()}
          setOpened={setExportDropdownOpened}
          placement="bottom-start"
          cardProps={{ class: "mt-3" }}
        >
          <IconButton
            path={mdiLanguageHtml5}
            text="soft"
            variant="text"
            label="HTML"
            disabled={loading()}
            class="justify-start"
            onClick={() => exportContent("html")}
          />
          <IconButton
            path={mdiCodeJson}
            text="soft"
            variant="text"
            label="JSON"
            disabled={loading()}
            class="justify-start"
            onClick={() => exportContent("json")}
          />
        </Dropdown>
      </div>
      <Overlay
        opened={exportMenuOpened()}
        onOverlayClick={() => {
          setExportMenuOpened(false);
        }}
      >
        <Card class="w-[calc(100vw-8rem)] h-[calc(100vh-8rem)] p-4 flex flex-col" color="contrast">
          <div class="flex items-center justify-center">
            <Heading class="flex-1">
              {exportType() === "html" && "HTML "}
              {exportType() === "json" && "JSON "}Export
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
                  const mimeType = exportType() === "html" ? "text/html" : "application/json";
                  const a = document.createElement("a");
                  const file = new Blob([code()], {
                    type: mimeType
                  });

                  a.href = URL.createObjectURL(file);
                  a.download = `${props.editedContentPiece.id}.${exportType()}`;
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