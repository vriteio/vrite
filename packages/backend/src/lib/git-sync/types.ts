import { InputTransformer } from "@vrite/sdk/transformers";
import { ObjectId } from "mongodb";
import { FullContentPiece } from "#database";
import { UnderscoreID } from "#lib/mongo";

interface ProcessInputResult {
  buffer: Buffer;
  contentHash: string;
  metadata: Partial<
    Pick<FullContentPiece, keyof NonNullable<ReturnType<InputTransformer>["contentPiece"]>>
  >;
}
interface OutputContentProcessorInput {
  buffer: Buffer;
  contentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
}

interface InputContentProcessor {
  process(inputContent: string): Promise<ProcessInputResult>;
  processBatch(inputContent: string[]): Promise<ProcessInputResult[]>;
}

interface OutputContentProcessor {
  process(input: OutputContentProcessorInput): Promise<string>;
  processBatch(input: OutputContentProcessorInput[]): Promise<string[]>;
}

export type { InputContentProcessor, OutputContentProcessor, OutputContentProcessorInput };
