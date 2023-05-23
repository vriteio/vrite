import { DocsLanguage, useDocsContext } from "./config";
import { Button, Card, IconButton, Input, Select, Tooltip } from "../../components/primitives";
import {
  JSONEditor,
  useNotificationContext,
  useConfirmationContext
} from "../../components/fragments";
import contentType from "../../lib/content-types.json";
import { monaco } from "../../packages/monaco";
import { createMemo, createSignal, For, ParentComponent, Show } from "solid-js";
import { nanoid } from "nanoid";
import curlString from "curl-string";
import { createStore } from "solid-js/store";
import { mdiAsterisk, mdiClipboardOutline, mdiEqualBox, mdiPlayCircleOutline } from "@mdi/js";

interface ResponseExample {
  name: string;
  data: Record<string, any>;
  id: string;
}
interface DescriptionProps {
  method: string;
  endpoint: string;
  parameters?: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
    default?: string;
  }>;
  body?: {
    schema: string;
    example: Record<string, any>;
  };
  responseExamples: ResponseExample[];
}

const Description: ParentComponent<DescriptionProps> = (props) => {
  const { config } = useDocsContext();
  const { notify } = useNotificationContext();
  const { confirmDelete } = useConfirmationContext();
  const [parameterValues, setParameterValues] = createStore<Record<string, string>>();
  const [body, setBody] = createSignal(JSON.stringify(props.body?.example || {}, null, 2));
  const sections = createMemo(() => {
    const sections: Array<{ label: string; id: string }> = [];

    if (props.parameters) {
      sections.push({ label: "Parameters", id: "parameters" });
    }

    if (props.body) {
      sections.push({ label: "Body", id: "body" });
    }

    sections.push({ label: "Response", id: "response" });

    return sections;
  });
  const queryString = createMemo(() => {
    return new URLSearchParams(
      Object.entries(parameterValues).filter(([key, value]) => {
        return Boolean(value);
      })
    ).toString();
  });
  const url = createMemo(() => {
    return `${config.baseUrl}${props.endpoint}${queryString() ? `?${queryString()}` : ""}`;
  });
  const curl = createMemo<string>((value) => {
    let parsedBody = {};

    try {
      parsedBody = JSON.parse(body());
    } catch (error) {
      return value || "";
    }

    return curlString(
      `"${url()}"`,
      {
        method: props.method,
        headers: {
          Authorization: `Bearer ${config.token || "<YOUR-TOKEN>"}`,
          ...(body() !== "{}" && {
            "Content-Type": contentType.json
          }),
          Accept: contentType.json
        },
        ...(body() !== "{}" && {
          body: parsedBody
        })
      },
      { colorJson: false, jsonIndentWidth: 4 }
    );
  });
  const code = createMemo(() => {
    return `${convertCurl(curl(), config.language)}\n`;
  });
  const [activeSection, setActiveSection] = createSignal(sections()[0].id);
  const [activeResponseSample, setActiveResponseSample] = createSignal<ResponseExample | null>(
    props.responseExamples[0]
  );
  const id = nanoid();
  const execute = async (): Promise<void> => {
    const response = await fetch(url(), {
      method: props.method,
      headers: {
        Authorization: `Bearer ${config.token || "<YOUR-TOKEN>"}`,
        Accept: contentType.json,
        ...(body() !== "{}" && {
          "Content-Type": contentType.json
        })
      },
      ...(body() === "{}" ? {} : { body: body() })
    });
    const json = await response.json();

    setActiveResponseSample({ id: "", name: "Result", data: json });
    setActiveSection("response");
  };

  if (props.body?.schema) {
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      enableSchemaRequest: true,
      schemas: [{ uri: `${config.baseUrl}${props.body.schema}`, fileMatch: [`${id}.json`] }]
    });
  }

  return (
    <Card class="relative p-4 m-0 text-gray-700 dark:text-gray-300">
      <div class="flex">
        <Button badge class="m-0 font-mono text-xl font-semibold" color="contrast" size="large">
          {props.method} {props.endpoint}
        </Button>
      </div>
      <p class="mx-2">{props.children}</p>
      <div class="relative">
        <JSONEditor
          color="contrast"
          language={getEditorLanguage(config.language)}
          wrapperClass="rounded-none"
          readOnly
          code={code()}
        />
        <div class="absolute flex justify-start m-0 bottom-2 right-2">
          <IconButton
            path={mdiPlayCircleOutline}
            class="m-0"
            text="base"
            color="primary"
            variant="text"
            label="Execute"
            disabled={!config.token}
            onClick={() => {
              if (props.method === "DELETE") {
                confirmDelete({
                  header: "Execute DELETE call",
                  content: (
                    <p>
                      Are you sure you want to execute this <code>DELETE</code> API call?
                    </p>
                  ),
                  onConfirm() {
                    execute();
                  }
                });
              } else {
                execute();
              }
            }}
          />
          <div class="h-8 pl-1 mr-1 border-r-2 border-gray-500 dark:border-gray-400" />
          <Tooltip text="Copy" class="mt-1">
            <IconButton
              path={mdiClipboardOutline}
              class="m-0"
              text="soft"
              variant="text"
              onClick={async () => {
                await window.navigator.clipboard.writeText(code().trim());
                notify({ text: "Copied to clipboard", type: "success" });
              }}
            />
          </Tooltip>
        </div>
      </div>
      <div class="flex w-full gap-3 my-3">
        <For each={sections()}>
          {(section) => {
            return (
              <Button
                variant={section.id === activeSection() ? "solid" : "text"}
                text={section.id === activeSection() ? "base" : "soft"}
                color="contrast"
                class="py-1 m-0 text-xl font-semibold"
                onClick={() => setActiveSection(section.id)}
              >
                {section.label}
              </Button>
            );
          }}
        </For>
      </div>
      <Show when={activeSection() === "parameters"}>
        <div class="flex flex-col gap-4">
          <For each={props.parameters}>
            {(parameter) => {
              return (
                <Card color="contrast" class="m-0">
                  <div class="flex items-center">
                    <Button badge text="soft" class="m-0 font-mono font-bold">
                      {parameter.name}
                    </Button>
                    <code class="!bg-transparent text-sm flex-1">{parameter.type}</code>
                    <Show when={parameter.required}>
                      <IconButton
                        path={mdiAsterisk}
                        color="primary"
                        badge
                        label="Required"
                      ></IconButton>
                    </Show>
                    <Show when={parameter.default}>
                      <IconButton
                        path={mdiEqualBox}
                        text="soft"
                        badge
                        label={
                          <span class="pl-1">
                            Default: <b>{parameter.default}</b>
                          </span>
                        }
                      ></IconButton>
                    </Show>
                  </div>
                  <p class="pl-1 m-0 mt-2">{parameter.description}</p>
                  <Input
                    placeholder="value"
                    class="max-w-80"
                    value={parameterValues[parameter.name]}
                    setValue={(value) => {
                      setParameterValues(parameter.name, value);
                    }}
                  />
                </Card>
              );
            }}
          </For>
        </div>
      </Show>
      <Show when={activeSection() === "body"}>
        <JSONEditor
          color="contrast"
          code={body()}
          fileName={`${id}.json`}
          onChange={(value) => {
            setBody(value);
          }}
        />
      </Show>
      <Show when={activeSection() === "response" && props.responseExamples}>
        <div class="relative">
          <JSONEditor
            color="contrast"
            code={`${JSON.stringify(activeResponseSample()?.data || {}, null, 2)}\n\n`}
            maxHeight={400}
            readOnly
          />
          <Select
            placeholder="Examples"
            options={props.responseExamples.map((responseExample) => {
              return { label: responseExample.name, value: responseExample.id };
            })}
            class="absolute bottom-2 right-2"
            value={activeResponseSample()?.id || ""}
            setValue={(value) => {
              setActiveResponseSample(
                props.responseExamples.find((responseExample) => {
                  return responseExample.id === value;
                }) || null
              );
            }}
          />
        </div>
      </Show>
    </Card>
  );
};

export { Description };
