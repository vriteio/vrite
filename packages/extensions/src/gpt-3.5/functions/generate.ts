import { ExtensionBlockActionViewContext } from "@vrite/extensions";
import { gfmTransformer } from "@vrite/sdk/transformers";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { marked } from "marked";

declare global {
  interface Window {
    currentRequestController?: AbortController;
  }
}

const generate = async (context: ExtensionBlockActionViewContext): Promise<void> => {
  const includeContext = context.temp.includeContext as boolean;
  const prompt = context.temp.prompt as string;

  let content = "";

  context.setTemp("$loading", true);
  window.currentRequestController = new AbortController();
  window.currentRequestController.signal.addEventListener("abort", () => {
    context.setTemp("$loading", false);
    context.refreshContent();
  });
  await fetchEventSource("https://extensions.vrite.io/gpt", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Accept": "text/event-stream"
    },
    body: JSON.stringify({
      prompt: includeContext ? `"${gfmTransformer(context.content)}"\n\n${prompt}` : prompt
    }),
    signal: window.currentRequestController?.signal,
    async onopen() {
      return;
    },
    onerror(error) {
      context.setTemp("$loading", false);
      context.refreshContent();
      context.notify({ text: "Error while generating content", type: "error" });
      throw error;
    },
    onmessage(event) {
      const partOfContent = decodeURIComponent(event.data);

      content += partOfContent;
      context.replaceContent(marked.parse(content));
    },
    onclose() {
      context.setTemp("$loading", false);
      context.refreshContent();
    }
  });
};

export default generate;
