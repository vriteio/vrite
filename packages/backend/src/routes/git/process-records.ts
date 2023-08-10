import { minimatch } from "minimatch";
import { FullGitData, GitRecord } from "#database";
import { ObjectId, UnderscoreID } from "#lib";

type RecordsProcessor = (gitData: UnderscoreID<FullGitData<ObjectId>>) => GitRecord<ObjectId>[];

const processRecordsGitHub: RecordsProcessor = (gitData) => {
  if (!gitData.github) return [];

  return gitData.records.filter((record) => {
    return minimatch(record.path, gitData.github!.matchPattern);
  });
};
const processRecords: RecordsProcessor = (gitData) => {
  if (gitData.provider === "github") {
    return processRecordsGitHub(gitData);
  }

  return gitData.records;
};

export { processRecords };
