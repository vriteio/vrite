import { ExtensionContentPieceViewContext } from "@vrite/extensions";

const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};
const publish = async (context: ExtensionContentPieceViewContext): Promise<void> => {
  try {
    context.setTemp("$loading", true);

    const response = await fetch("https://extensions.vrite.io/hashnode", {
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

    if (!response.ok || !data.hashnodeId) {
      throw new Error("Couldn't publish to Hashnode");
    }

    if (context.data.hashnodeId) {
      context.notify({ text: "Updated on Hashnode", type: "success" });
    } else {
      context.notify({ text: "Published to Hashnode", type: "success" });
    }

    if (
      !context.contentPiece.locked &&
      data.hashnodeId &&
      data.hashnodeId !== context.data.hashnodeId
    ) {
      context.setData("hashnodeId", data.hashnodeId);
    }

    context.setTemp({
      $loading: false,
      buttonLabel: "Update"
    });
  } catch (error) {
    context.notify({ text: "Couldn't publish to Hashnode", type: "error" });
    context.setTemp("$loading", false);
  }
};

export default publish;
