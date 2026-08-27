import { saveGroup, type SaveGroupInput, type SaveGroupResult } from "./update";

const createGroup = async (input: SaveGroupInput): Promise<SaveGroupResult> => {
  return saveGroup(input);
};

export { createGroup };
