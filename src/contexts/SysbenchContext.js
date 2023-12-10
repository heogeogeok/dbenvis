import { createContext, useState } from "react";

export const SysbenchContext = createContext();
const SysbenchContextProvider = (props) => {
  // 각 metric의 average
  const [avgMetric, setAvgMetric] = useState([]);

  // 시각화 할 metric
  const [selectedMetric, setselectedMetric] = useState("tps");

  return (
    <SysbenchContext.Provider
      value={{ avgMetric, setAvgMetric, selectedMetric, setselectedMetric }}
    >
      {props.children}
    </SysbenchContext.Provider>
  );
};

export default SysbenchContextProvider;
