import { Component, ParentComponent, createContext, useContext } from "solid-js";

interface ExplorerContextData {}

const ExplorerContext = createContext<ExplorerContextData>({});
const ExplorerProvider: ParentComponent = (props) => {
  return <ExplorerContext.Provider value={{}}>{props.children}</ExplorerContext.Provider>;
};
const useExplorer = (): ExplorerContextData => {
  return useContext(ExplorerContext);
};

export {};
