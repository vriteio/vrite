type Ref<V> = [() => V | null, (value: V) => void];

const createRef = <V>(initialValue?: V | null): Ref<V> => {
  let ref: V | null = initialValue || null;

  return [
    () => ref,
    (value) => {
      ref = value;
    }
  ];
};

export { createRef };
export type { Ref };
