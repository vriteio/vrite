import { createContext, ParentComponent, useContext } from "solid-js";

interface CommentDataContextData {}

const CommentDataContext = createContext<CommentDataContextData>();
const CommentDataProvider: ParentComponent = (props) => {
  return <CommentDataContext.Provider value={{}}>{props.children}</CommentDataContext.Provider>;
};
const useCommentData = (): CommentDataContextData => {
  return useContext(CommentDataContext)!;
};

export { CommentDataProvider, useCommentData };
