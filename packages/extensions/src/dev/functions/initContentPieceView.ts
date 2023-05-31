import { ExtensionContentPieceViewContext } from "@vrite/extensions";

const initContentPieceView = async (context: ExtensionContentPieceViewContext): Promise<void> => {
  context.setTemp({
    buttonLabel: context.data.devId ? "Update" : "Publish",
    disabled:
      !context.config.apiKey || !context.config.contentGroupId || context.contentPiece.locked,
    $loading: false
  });
};

export default initContentPieceView;
