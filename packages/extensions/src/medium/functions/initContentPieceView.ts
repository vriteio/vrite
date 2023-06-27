import { ExtensionContentPieceViewContext } from "@vrite/extensions";

const initContentPieceView = async (context: ExtensionContentPieceViewContext): Promise<void> => {
  context.setTemp({
    buttonLabel: context.data.mediumId ? "Republish" : "Publish",
    disabled:
      !context.config.token ||
      !context.config.contentGroupId ||
      (context.config.autoPublish && !context.config.contentGroupId),
    $loading: false
  });

  if (typeof context.data.draft !== "boolean") {
    context.setData("draft", context.config.draft || false);
  }
  if (typeof context.data.autoPublish !== "boolean") {
    context.setData("autoPublish", true);
  }
};

export default initContentPieceView;
