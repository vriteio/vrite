import { askCurrent, searchCurrent } from "./current";
import { askPublished, searchPublished } from "./published";

const Search = {
  askCurrent,
  askPublished,
  current: searchCurrent,
  published: searchPublished
};

export { Search };
