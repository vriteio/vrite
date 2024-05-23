const selectionColors = [
  "red",
  "orange",
  "amber",
  "purple",
  "indigo",
  "blue",
  "cyan",
  "green",
  "teal",
  "lime",
  "emerald"
] as const;
const selectionClasses: Record<
  (typeof selectionColors)[number],
  {
    cursor: string;
    outline: string;
    label: string;
    gapCursor: string;
  }
> = {
  red: {
    cursor: "ring-red-500",
    outline: "border-red-500",
    label: "bg-red-500 dark:bg-red-500",
    gapCursor: "!after:border-red-500 !dark:after:border-red-500"
  },
  orange: {
    cursor: "ring-orange-500",
    outline: "border-orange-500",
    label: "bg-orange-500 dark:bg-orange-500",
    gapCursor: "!after:border-orange-500 !dark:after:border-orange-500"
  },
  amber: {
    cursor: "ring-amber-500",
    outline: "border-amber-500",
    label: "bg-amber-500 dark:bg-amber-500",
    gapCursor: "!after:border-amber-500 !dark:after:border-amber-500"
  },
  purple: {
    cursor: "ring-purple-500",
    outline: "border-purple-500",
    label: "bg-purple-500 dark:bg-purple-500",
    gapCursor: "!after:border-purple-500 !dark:after:border-purple-500"
  },
  indigo: {
    cursor: "ring-indigo-500",
    outline: "border-indigo-500",
    label: "bg-indigo-500 dark:bg-indigo-500",
    gapCursor: "!after:border-indigo-500 !dark:after:border-indigo-500"
  },
  blue: {
    cursor: "ring-blue-500",
    outline: "border-blue-500",
    label: "bg-blue-500 dark:bg-blue-500",
    gapCursor: "!after:border-blue-500 !dark:after:border-blue-500"
  },
  cyan: {
    cursor: "ring-cyan-500",
    outline: "border-cyan-500",
    label: "bg-cyan-500 dark:bg-cyan-500",
    gapCursor: "!after:border-cyan-500 !dark:after:border-cyan-500"
  },
  green: {
    cursor: "ring-green-500",
    outline: "border-green-500",
    label: "bg-green-500 dark:bg-green-500",
    gapCursor: "!after:border-green-500 !dark:after:border-green-500"
  },
  teal: {
    cursor: "ring-teal-500",
    outline: "border-teal-500",
    label: "bg-teal-500 dark:bg-teal-500",
    gapCursor: "!after:border-teal-500 !dark:after:border-teal-500"
  },
  lime: {
    cursor: "ring-lime-500",
    outline: "border-lime-500",
    label: "bg-lime-500 dark:bg-lime-500",
    gapCursor: "!after:border-lime-500 !dark:after:border-lime-500"
  },
  emerald: {
    cursor: "ring-emerald-500",
    outline: "border-emerald-500",
    label: "bg-emerald-500 dark:bg-emerald-500",
    gapCursor: "!after:border-emerald-500 !dark:after:border-emerald-500"
  }
};
const getSelectionColor = (): (typeof selectionColors)[number] => {
  const index = Math.floor(Math.random() * selectionColors.length);

  return selectionColors[index] || "blue";
};

export { selectionClasses, selectionColors, getSelectionColor };
