/** @jsx createElement */
import {
  Components,
  createView,
  createTemp,
  createFunction,
  createElement,
  createExtension
} from "./extensions-sdk";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { gfmInputTransformer, gfmOutputTransformer } from "@vrite/sdk/transformers";

declare global {
  interface Window {
    currentRequestController?: AbortController;
  }
}

const stopIcon =
  "M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z";

export default createExtension({
  name: "gpt-4",
  displayName: "GPT-4",
  description: "Integrates OpenAI's GPT-3.5 into the editor",
  permissions: [],
  onConfigure: createFunction(() => {}),
  onUninstall: createFunction(() => {}),
  blockActions: [
    {
      id: "gpt-4",
      blocks: ["paragraph"],
      label: "GPT-4",
      view: createView((context) => {
        // Sandbox, interactive part of the view

        // Create context
        const [prompt, setPrompt] = createTemp<string>("");
        const [includeContext, setIncludeContext] = createTemp<boolean>(false);
        const [loading, setLoading] = createTemp<boolean>(false);
        // Create functions (running in the sandbox only when called)
        const generate = createFunction(async () => {
          let content = "";
          let processedPrompt = prompt();

          if (includeContext()) {
            processedPrompt = `"${gfmOutputTransformer(context.content)}"\n\n${prompt()}`;
          }

          setLoading(true);
          window.currentRequestController = new AbortController();
          window.currentRequestController.signal.addEventListener("abort", () => {
            setLoading(false);
            // Force refresh
          });
          await fetchEventSource("https://extensions.vrite.io/gpt", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "text/event-stream"
            },
            body: JSON.stringify({
              prompt: processedPrompt
            }),
            signal: window.currentRequestController?.signal,
            async onopen() {
              return;
            },
            onerror(error) {
              setLoading(false);
              // Force refresh
              context.notify({ text: "Error while generating content", type: "error" });
              throw error;
            },
            onmessage(event) {
              const partOfContent = decodeURIComponent(event.data);

              content += partOfContent;
              context.replaceContent(gfmInputTransformer(content).content);
            },
            onclose() {
              setLoading(false);
              context.refreshContent();
            }
          });
        });
        const stop = createFunction(() => {
          window.currentRequestController?.abort();
          setLoading(false);
        });

        // Extracted to static JSON template
        return (
          <Components.View class="max-w-sm flex flex-col gap-3">
            <Components.Field
              type="text"
              color="contrast"
              label="Prompt"
              textarea={true}
              bind:value={prompt}
            />
            <Components.Field type="checkbox" label="Include context" bind:value={includeContext}>
              Quote paragraph in the beginning of the prompt for additional context
            </Components.Field>
            <Components.View class="flex w-full gap-1">
              <Components.Button
                color="primary"
                class="m-0 flex-1"
                bind:loading={loading}
                on:click={generate}
              >
                Generate
              </Components.Button>
              <Components.Switch>
                <Components.Match bind:value={loading}>
                  <Components.Tooltip text="Stop" class="mt-1" fixed={true}>
                    <Components.IconButton
                      text="soft"
                      class="m-0"
                      path={stopIcon}
                      on:click={stop}
                    />
                  </Components.Tooltip>
                </Components.Match>
              </Components.Switch>
            </Components.View>
          </Components.View>
        );
      })
    }
  ]
});
