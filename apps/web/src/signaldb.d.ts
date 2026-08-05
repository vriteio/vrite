/* eslint-disable @typescript-eslint/no-explicit-any -- Mirrors SignalDB's public generic defaults and constraints. */
import type { BaseItem, Cursor, FindOptions, Selector } from "@signaldb/core";

declare module "@signaldb/core" {
  type SelectorWithExpr<T extends Record<string, any>> = Selector<T> & {
    $expr?: SelectorWithExpr<T>;
    $or?: SelectorWithExpr<T>[];
    $and?: SelectorWithExpr<T>[];
    $nor?: SelectorWithExpr<T>[];
  };

  interface Collection<T extends BaseItem<I> = BaseItem, I = any, E extends BaseItem = T, U = E> {
    find<O extends FindOptions<T>>(selector?: SelectorWithExpr<T>, options?: O): Cursor<T, E, U>;
  }
}
