import { ExtensionContentPieceViewContext } from "@vrite/extensions";

const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};
const publish = async (context: ExtensionContentPieceViewContext): Promise<void> => {
  try {
    context.setTemp("loading", true);
    console.log("publish", context, context.forceUpdate);
    context.forceUpdate();
    await wait(4000);

    const response = await fetch("https://dev.to/api/articles", {
      body: JSON.stringify({
        id: context.contentPiece.id,
        published: false, // !context.data.draft,
        series: context.data.seriesName
      })
    });
    const data = await response.json();

    if (context.data.devId) {
      context.notify({ text: "Updated on Dev.to", type: "success" });
    } else {
      context.notify({ text: "Published to Dev.to", type: "success" });
    }

    if (!context.contentPiece.locked && data.devId !== context.data.devId()) {
      context.setData("devId", data.devId);
    }

    context.setTemp("loading", false);
  } catch (error) {
    context.notify({ text: "Couldn't publish to Dev.to", type: "error" });
    context.setTemp("loading", false);
  }
};

export default publish;
