import { ExtensionContentPieceViewContext } from "@vrite/extensions";

const configure = async (context: ExtensionContentPieceViewContext): Promise<void> => {
  context.setTemp({
    buttonLabel: context.data.hashnode ? "Update" : "Publish",
    disabled:
      !context.config.accessToken || !context.config.contentGroupId || context.contentPiece.locked,
    $loading: false
  });

  if (typeof context.data.autoPublish !== "boolean") {
    context.setData("autoPublish", true);
  }
};

export default configure;
