import { createOutputContentProcessorGitHub, createInputContentProcessorGitHub } from "./github";
import { InputContentProcessor, OutputContentProcessor } from "./types";
import { ObjectId } from "mongodb";
import { FullGitData } from "#collections";
import { AuthenticatedContext, UnderscoreID } from "#lib";

const createGenericOutputContentProcessor = async (
  ctx: Pick<AuthenticatedContext, "db" | "auth">,
  gitData: UnderscoreID<FullGitData<ObjectId>>
): Promise<OutputContentProcessor> => {
  if (gitData.provider === "github") {
    return await createOutputContentProcessorGitHub(ctx, gitData);
  }

  return {
    process() {
      return Promise.resolve("");
    },
    processBatch(input) {
      return Promise.resolve(input.map(() => ""));
    }
  };
};
const createGenericInputContentProcessor = async (
  ctx: Pick<AuthenticatedContext, "db" | "auth">,
  gitData: UnderscoreID<FullGitData<ObjectId>>
): Promise<InputContentProcessor> => {
  if (gitData.provider === "github") {
    return await createInputContentProcessorGitHub(ctx, gitData);
  }

  return {
    process() {
      return Promise.resolve({
        contentHash: "",
        content: "",
        buffer: Buffer.from(""),
        metadata: {}
      });
    },
    processBatch(input) {
      return Promise.resolve(
        input.map(() => ({
          contentHash: "",
          content: "",
          buffer: Buffer.from(""),
          metadata: {}
        }))
      );
    }
  };
};

export { createGenericOutputContentProcessor, createGenericInputContentProcessor };
