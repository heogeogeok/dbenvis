import { createContext, useState } from "react";

export const TpchContext = createContext();
const TpchContextProvider = (props) => {
  // default 첫번째 쿼리로 설정
  const [selectedQuery, setSelectedQuery] = useState(0);

  // 각 파일의 각 쿼리의 duration
  const [durations, setDurations] = useState([]);

  return (
    <TpchContext.Provider
      value={{ selectedQuery, setSelectedQuery, durations, setDurations }}
    >
      {props.children}
    </TpchContext.Provider>
  );
};

export default TpchContextProvider;
