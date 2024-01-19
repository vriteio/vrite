import { ExtensionBlockActionViewContext } from "@vrite/extensions";

const stop = (context: ExtensionBlockActionViewContext): void => {
  window.currentRequestController?.abort();
  context.setTemp("$loading", false);
};

export default stop;
