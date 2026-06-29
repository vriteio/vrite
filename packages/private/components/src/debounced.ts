import { debounce, createScheduled } from "@solid-primitives/scheduled";
import { createMemo, type Accessor } from "solid-js";

const createDebounced = <T>(source: Accessor<T>, wait: number): Accessor<T> => {
  const scheduled = createScheduled((callback) => debounce(callback, wait));

  return createMemo((previous) => {
    const value = source();

    return scheduled() ? value : previous;
  }, source());
};

export { createDebounced };
