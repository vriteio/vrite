import { fetchEventSource } from "@microsoft/fetch-event-source";
import { gfmInputTransformer } from "@vrite/sdk/transformers";
import {
  Components,
  createView,
  createTemp,
  createFunction,
  createElement,
  defineExtension
} from "vrite:extension";

const stopIcon =
  "M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z";
const [prompt, setPrompt] = createTemp();
const [includeContext, setIncludeContext] = createTemp();
const [loading, setLoading] = createTemp(false);
const generate = createFunction(async ({ notify, replaceContent }) => {
  let content = "";

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
      prompt: includeContext() ? `"${gfmOutputTransformer(context.content)}"\n\n${prompt}` : prompt
    }),
    signal: window.currentRequestController?.signal,
    async onopen() {
      return;
    },
    onerror(error) {
      setLoading(false);
      // Force refresh
      notify({ text: "Error while generating content", type: "error" });
      throw error;
    },
    onmessage(event) {
      const partOfContent = decodeURIComponent(event.data);

      content += partOfContent;
      replaceContent(gfmInputTransformer(content).content);
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
const extension = defineExtension({
  name: "gpt-4",
  displayName: "GPT-4",
  description: "Integrates OpenAI's GPT-3.5 into the editor",
  permissions: [],
  blockActions: [
    createElement(
      Components.View,
      { class: "max-w-sm flex flex-col gap-3" },
      createElement(Components.Field, {
        type: "text",
        color: "contrast",
        label: "Prompt",
        textarea: true,
        value: prompt()
      }),
      createElement(
        Components.Field,
        {
          type: "checkbox",
          label: "Include context",
          value: includeContext()
        },
        "Quote paragraph in the beginning of the prompt for additional context"
      ),
      createElement(
        Components.View,
        { class: "flex w-full gap-1" },

        createElement(
          Components.Button,
          {
            color: "primary",
            class: "m-0 flex-1",
            loading: loading(),
            onClick: generate
          },
          "Generate"
        ),
        createElement(
          Components.Switch,
          null,
          createElement(
            Components.Match,
            { value: loading() === true },
            createElement(
              Components.Tooltip,
              { text: "Stop", class: "mt-1", fixed: true },
              createElement(Components.IconButton, {
                text: "soft",
                class: "m-0",
                path: stopIcon,
                onClick: stop
              })
            )
          )
        )
      )
    )
  ]
});

export { extension, generate, stop };
