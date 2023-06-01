import { App } from "#context";

const tagColorClasses: Record<App.TagColor, string> = {
  gray: ":base: border-gray-500 bg-gray-500 text-gray-500 dark:border-gray-400 dark:bg-gray-400 dark:text-gray-400",
  red: ":base: border-red-500 bg-red-500 text-red-500",
  pink: ":base: border-pink-500 bg-pink-500 text-pink-500",
  fuchsia: ":base: border-fuchsia-500 bg-fuchsia-500 text-fuchsia-500",
  orange: ":base: border-orange-500 bg-orange-500 text-orange-500",
  amber: ":base: border-amber-500 bg-amber-500 text-amber-500",
  purple: ":base: border-purple-500 bg-purple-500 text-purple-500",
  indigo: ":base: border-indigo-500 bg-indigo-500 text-indigo-500",
  blue: ":base: border-blue-500 bg-blue-500 text-blue-500",
  cyan: ":base: border-cyan-500 bg-cyan-500 text-cyan-500",
  green: ":base: border-green-500 bg-green-500 text-green-500",
  teal: ":base: border-teal-500 bg-teal-500 text-teal-500",
  lime: ":base: border-lime-500 bg-lime-500 text-lime-500",
  emerald: ":base: border-emerald-500 bg-emerald-500 text-emerald-500"
};

export { tagColorClasses };
