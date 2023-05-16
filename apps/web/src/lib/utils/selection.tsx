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
  "lime"
] as const;
const selectionClasses: Record<
  (typeof selectionColors)[number],
  {
    cursor: string;
    outline: string;
    label: string;
  }
> = {
  red: {
    cursor: "ring-red-500",
    outline: "border-red-500",
    label: "bg-red-500 dark:bg-red-500"
  },
  orange: {
    cursor: "ring-orange-500",
    outline: "border-orange-500",
    label: "bg-orange-500 dark:bg-orange-500"
  },
  amber: {
    cursor: "ring-amber-500",
    outline: "border-amber-500",
    label: "bg-amber-500 dark:bg-amber-500"
  },
  purple: {
    cursor: "ring-purple-500",
    outline: "border-purple-500",
    label: "bg-purple-500 dark:bg-purple-500"
  },
  indigo: {
    cursor: "ring-indigo-500",
    outline: "border-indigo-500",
    label: "bg-indigo-500 dark:bg-indigo-500"
  },
  blue: {
    cursor: "ring-blue-500",
    outline: "border-blue-500",
    label: "bg-blue-500 dark:bg-blue-500"
  },
  cyan: {
    cursor: "ring-cyan-500",
    outline: "border-cyan-500",
    label: "bg-cyan-500 dark:bg-cyan-500"
  },
  green: {
    cursor: "ring-green-500",
    outline: "border-green-500",
    label: "bg-green-500 dark:bg-green-500"
  },
  teal: {
    cursor: "ring-teal-500",
    outline: "border-teal-500",
    label: "bg-teal-500 dark:bg-teal-500"
  },
  lime: {
    cursor: "ring-lime-500",
    outline: "border-lime-500",
    label: "bg-lime-500 dark:bg-lime-500"
  }
};
const getSelectionColor = (): (typeof selectionColors)[number] => {
  const index = Math.floor(Math.random() * selectionColors.length);

  return selectionColors[index] || "blue";
};

export { selectionClasses, selectionColors, getSelectionColor };
