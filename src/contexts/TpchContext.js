import { createContext, useState } from "react";

export const TpchContext = createContext();
const TpchContextProvider = (props) => {
  // default 첫번째 쿼리로 설정
  const [selectedQuery, setSelectedQuery] = useState(0);

  return (
    <TpchContext.Provider value={{ selectedQuery, setSelectedQuery }}>
      {props.children}
    </TpchContext.Provider>
  );
};

export default TpchContextProvider;
