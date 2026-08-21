import { createChannel } from "./create";
import { deleteChannel } from "./delete";
import { listChannels } from "./list";

const Channels = {
  create: createChannel,
  delete: deleteChannel,
  list: listChannels
};

export { Channels };
