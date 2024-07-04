import {
  Accessor,
  ParentComponent,
  Setter,
  createContext,
  createSignal,
  onCleanup,
  useContext
} from "solid-js";
import { MetaProvider as SolidMetaProvider, Title } from "@solidjs/meta";

interface MetaControllerData {
  metaTitle: Accessor<string>;
  setMetaTitle: Setter<string>;
}

const MetaControllerContext = createContext<MetaControllerData>();
const MetaProvider: ParentComponent = (props) => {
  const [metaTitle, setMetaTitleValue] = createSignal("");
  const setMetaTitle = (value: string | ((value: string) => string)): void => {
    setMetaTitleValue(value);
    onCleanup(() => setMetaTitleValue(""));
  };

  return (
    <SolidMetaProvider>
      <Title>{metaTitle() || "Vrite"}</Title>
      <MetaControllerContext.Provider value={{ metaTitle, setMetaTitle }}>
        {props.children}
      </MetaControllerContext.Provider>
    </SolidMetaProvider>
  );
};
const useMeta = (): MetaControllerData => {
  return useContext(MetaControllerContext)!;
};

export { MetaProvider, useMeta };
