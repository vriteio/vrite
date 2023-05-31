import { ExtensionContentPieceViewContext } from "@vrite/extensions";

const configure = async (context: ExtensionContentPieceViewContext): Promise<void> => {
  context.setTemp({
    buttonLabel: context.data.devId ? "Update" : "Publish",
    $loading: false,
    buttonDisabled: !context.config.apiKey || !context.config.contentGroupId
  });
};

export default configure;
