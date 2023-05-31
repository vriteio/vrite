import { ExtensionContentPieceViewContext } from "@vrite/extensions";

const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};
const publish = async (context: ExtensionContentPieceViewContext): Promise<void> => {
  try {
    context.setTemp("$loading", true);

    const response = await fetch("https://extensions.vrite.io/dev", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${context.token}`,
        "X-Vrite-Extension-Id": context.extensionId,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contentPieceId: context.contentPiece.id
      })
    });
    const data = await response.json();

    if (context.data.devId) {
      context.notify({ text: "Updated on Dev.to", type: "success" });
    } else {
      context.notify({ text: "Published to Dev.to", type: "success" });
    }

    if (!context.contentPiece.locked && data.devId && data.devId !== context.data.devId) {
      context.setData("devId", data.devId);
    }

    context.setTemp({
      $loading: false,
      buttonLabel: "Update"
    });
  } catch (error) {
    context.notify({ text: "Couldn't publish to Dev.to", type: "error" });
    context.setTemp("$loading", false);
  }
};

export default publish;
