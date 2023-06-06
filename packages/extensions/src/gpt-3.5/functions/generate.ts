import { ExtensionBlockActionViewContext } from "@vrite/extensions";
import { gfmTransformer } from "@vrite/sdk/transformers";

const generate = async (context: ExtensionBlockActionViewContext): Promise<void> => {
  const includeContext = context.temp.includeContext as boolean;
  const prompt = context.temp.prompt as string;
  const response = await fetch("https://extensions.vrite.io/gpt", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${context.token}`,
      "X-Vrite-Extension-Id": context.extensionId,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      prompt: includeContext ? `${gfmTransformer(context.content)}\n\n${prompt}` : prompt
    })
  });

  const result = await response.json();

  context.replaceContent(`<p>${result.message}</p>`);
};

export default generate;
