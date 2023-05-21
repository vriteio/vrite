type Ref<V> = [() => V, (value: V) => void];

const createRef = <V>(initialValue: V): Ref<V> => {
  let ref = initialValue;

  return [
    () => ref,
    (value) => {
      ref = value;
    }
  ];
};

export { createRef };
export type { Ref };
