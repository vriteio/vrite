import { getTypeString, getDescription } from "./utils";
import { mdiAsterisk, mdiChevronRight, mdiEqual } from "@mdi/js";
import { Component, For, Show, createSignal } from "solid-js";
import { Dynamic } from "solid-js/web";
import { OpenAPIV3 } from "openapi-types";
import clsx from "clsx";
import { Icon, IconButton } from "#components/primitives";

interface ParamDescriptionProps {
  name: string;
  schema: OpenAPIV3.SchemaObject;
  level?: number;
  labels?: boolean;
  required?: boolean;
}

const ParamDescription: Component<ParamDescriptionProps> = (props) => {
  const expandableObject = "properties" in props.schema;
  const expandableArrayItem = props.schema.type === "array" && "properties" in props.schema.items;
  const expandable = expandableObject || expandableArrayItem;
  const [expanded, setExpanded] = createSignal(false);

  return (
    <div class="border-t-2 flex flex-col h-full border-gray-200 dark:border-gray-700">
      <Dynamic
        component={expandable ? "button" : "div"}
        class={clsx(
          "m-0 p-2 flex flex-col w-full",
          expandable && "hover:bg-gray-200 hover:dark:bg-gray-700"
        )}
        onClick={() => setExpanded(!expanded())}
      >
        <div class="flex items-center w-full">
          <span class="flex-1 text-start">
            <span class="m-0 font-mono font-semibold text-base">{props.name}</span>
            <span class="text-sm font-mono px-2 text-gray-500 dark:text-gray-400">
              {getTypeString(props.schema)}
            </span>
          </span>
          {props.schema.default && props.labels !== false && (
            <IconButton
              class="m-0 font-mono"
              size="small"
              text="soft"
              path={mdiEqual}
              label={props.schema.default}
              color="contrast"
              hover={false}
              badge
            />
          )}
          {(props.required || props.schema.required) && props.labels !== false && (
            <IconButton
              class="m-0"
              size="small"
              path={mdiAsterisk}
              color="primary"
              label="Required"
              hover={false}
              badge
            />
          )}
          <Show when={expandable}>
            <Icon
              path={mdiChevronRight}
              class={clsx(
                "mx-1 text-gray-500 dark:text-gray-400 h-6 w-6 transform",
                expanded() && "rotate-90"
              )}
            />
          </Show>
        </div>
        {getDescription(props.schema) && (
          <p class="m-0 mt-1 text-sm">{getDescription(props.schema)}</p>
        )}
        {props.schema.enum && (
          <p class="mt-2 mb-0 text-sm gap-1 flex flex-wrap justify-start leading-4">
            {props.schema.enum.map((value) => {
              return (
                <span class="font-mono px-1.5 py-1 rounded-md bg-gray-200 dark:bg-gray-800">
                  {value}
                </span>
              );
            })}
          </p>
        )}
      </Dynamic>
      <Show when={expandable} keyed>
        {(_) => {
          let { schema } = props;

          if (expandableArrayItem) {
            schema = (props.schema as OpenAPIV3.ArraySchemaObject).items as OpenAPIV3.SchemaObject;
          }

          return (
            <div class={clsx("overflow-hidden flex", !expanded() && "max-h-0")}>
              <div class="min-w-8 h-full flex justify-center items-center py-3">
                <div class="h-full w-2px rounded-full bg-gray-200 dark:bg-gray-700" />
              </div>
              <div class="flex flex-col flex-1">
                <For each={Object.keys(schema.properties || {})}>
                  {(parameterName) => {
                    const parameterSchema = schema.properties![
                      parameterName
                    ] as OpenAPIV3.SchemaObject;

                    return (
                      <ParamDescription
                        name={parameterName}
                        schema={parameterSchema}
                        level={(props.level || 1) + 1}
                        labels={props.labels}
                      />
                    );
                  }}
                </For>
              </div>
            </div>
          );
        }}
      </Show>
    </div>
  );
};

export { ParamDescription };
