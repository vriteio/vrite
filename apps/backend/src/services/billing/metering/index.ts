import { getUsage } from "./get-usage";
import { flushUsage, recordUsage } from "./record-usage";

const Metering = {
  getUsage,
  recordUsage,
  flushUsage
};

export { Metering };
