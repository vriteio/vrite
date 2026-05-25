import { clientOnly } from "@solidjs/start";
import "./styles.scss";

const Editor = clientOnly(async () => ({
  default: (await import("./client")).ClientEditor
}));

export { Editor };
