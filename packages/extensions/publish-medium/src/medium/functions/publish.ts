import { ExtensionContentPieceViewContext } from "@vrite/extensions";

const publish = async (context: ExtensionContentPieceViewContext): Promise<void> => {
  try {
    context.setTemp("$loading", true);

    const response = await fetch("https://extensions.vrite.io/medium", {
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

    if (!response.ok || !data.mediumId) {
      throw new Error("Couldn't publish to Medium");
    }

    if (context.data.mediumId) {
      context.notify({ text: "Republished to Medium", type: "success" });
    } else {
      context.notify({ text: "Published to Medium", type: "success" });
    }

    if (data.mediumId && data.mediumId !== context.data.mediumId) {
      context.setData("mediumId", data.mediumId);
    }

    context.setTemp({
      $loading: false,
      buttonLabel: "Republish"
    });
  } catch (error) {
    context.notify({ text: "Couldn't publish to Medium", type: "error" });
    context.setTemp("$loading", false);
  }
};

export default publish;
