import { ExtensionConfigurationViewContext } from "@vrite/extensions";

const configure = async (context: ExtensionConfigurationViewContext): Promise<void> => {
  context.setTemp("lockedContentGroups", [
    { value: "test", label: "Test" },
    { value: "test2", label: "Test2" }
  ]);
};

export default configure;
