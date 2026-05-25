type Ref<V> = [() => V | null, (value: V) => void];

const createRef = <V extends any>(): Ref<V> => {
  let ref: V | null = null;

  return [
    () => ref,
    (value) => {
      ref = value;
    },
  ];
};

export { createRef };
export type { Ref };
