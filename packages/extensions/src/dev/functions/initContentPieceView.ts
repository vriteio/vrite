import { ExtensionContentPieceViewContext } from "@vrite/extensions";

const configure = async (context: ExtensionContentPieceViewContext): Promise<void> => {
  context.setTemp({ buttonLabel: "Publish", $loading: true });
};

export default configure;
