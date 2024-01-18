import { commit } from "./commit";
import { initialSync } from "./initial-sync";
import { pull } from "./pull";
import { defineGitProvider } from "../../provider";

const useGitHubProvider = defineGitProvider({
  getData: ({ gitData }) => {
    return gitData.github!;
  },
  commit,
  initialSync,
  pull
});

export { useGitHubProvider };
