import { ObjectId, Binary } from "mongodb";
import { convert as convertToSlug } from "url-slug";
import { FullContentPiece, FullContents } from "#collections";
import { InputContentProcessor, UnderscoreID } from "#lib";

const createSyncedPieces = async (
  inputs: Array<{
    path: string;
    content: string;
    workspaceId: ObjectId;
    contentGroupId: ObjectId;
    order: string;
  }>,
  inputContentProcessor: InputContentProcessor
): Promise<
  Array<{
    contentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
    content: UnderscoreID<FullContents<ObjectId>>;
    contentHash: string;
  }>
> => {
  const inputContentProcessorOutput = await inputContentProcessor.processBatch(
    inputs.map((input) => input.content)
  );

  return inputs.map((input, index) => {
    const filename = input.path.split("/").pop() || "";
    const { buffer, contentHash, metadata } = inputContentProcessorOutput[index];
    const { members, tags, date, ...inputMetadata } = metadata;
    const contentPiece: UnderscoreID<FullContentPiece<ObjectId>> = {
      _id: new ObjectId(),
      workspaceId: input.workspaceId,
      contentGroupId: input.contentGroupId,
      order: input.order,
      members: [],
      slug: convertToSlug(filename),
      tags: [],
      title: filename,
      filename,
      ...inputMetadata,
      ...(date && { date: new Date(date) }),
      ...(members && { members: members.map((memberId) => new ObjectId(memberId)) }),
      ...(tags && { tags: tags.map((tagId) => new ObjectId(tagId)) })
    };
    const content = {
      _id: new ObjectId(),
      contentPieceId: contentPiece._id,
      content: new Binary(buffer)
    };

    return {
      contentPiece,
      contentHash,
      content
    };
  });
};

export { createSyncedPieces };
