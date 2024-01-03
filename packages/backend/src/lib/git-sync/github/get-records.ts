import { GitSyncConfiguration } from "../integration";
import { minimatch } from "minimatch";

const getRecords: GitSyncConfiguration["getRecords"] = ({ gitData }) => {
  if (!gitData.github) return [];

  return gitData.records.filter((record) => {
    return minimatch(record.path, gitData.github!.matchPattern);
  });
};

export { getRecords };
