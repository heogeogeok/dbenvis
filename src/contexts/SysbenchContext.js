import { createContext, useState } from "react";

export const SysbenchContext = createContext();
const SysbenchContextProvider = (props) => {
  // 각 결과의 average TPS
  const [avgTps, setAvgTps] = useState([]);

  return (
    <SysbenchContext.Provider value={{ avgTps, setAvgTps }}>
      {props.children}
    </SysbenchContext.Provider>
  );
};

export default SysbenchContextProvider;
