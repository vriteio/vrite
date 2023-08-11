import { mdiGithub } from "@mdi/js";

interface Provider {
  label: string;
  name: string;
  icon: string;
}

const providers: Provider[] = [
  {
    label: "GitHub",
    name: "github",
    icon: mdiGithub
  }
];

export { providers };
