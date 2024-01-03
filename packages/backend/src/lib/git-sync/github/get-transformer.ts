import { GitSyncConfiguration } from "../integration";

const getTransformer: GitSyncConfiguration["getTransformer"] = ({ gitData }) => {
  if (!gitData.github) return "markdown";

  return gitData.github.transformer;
};

export { getTransformer };
