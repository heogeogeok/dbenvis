import { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Tpch from "./tpch/Tpch";
import Sysbench from "./sysbench/Sysbench";
import TpchContextProvider from "../contexts/TpchContext";
import SysbenchContextProvider from "../contexts/SysbenchContext";
import "../App.css";

function Layout() {
  const [selected, setSelected] = useState(null); // 선택한 benchmark

  const [resultFiles, setResultFiles] = useState([]);
  const [explainFiles, setExplainFiles] = useState([]);

  return (
    <div>
      <Header />
      <div className="main-container">
        <TpchContextProvider>
          <SysbenchContextProvider>
            <Sidebar
              selected={selected}
              setSelected={setSelected}
              resultFiles={resultFiles}
              setResultFiles={setResultFiles}
              explainFiles={explainFiles}
              setExplainFiles={setExplainFiles}
            />
            {selected === "TPC-H" && (
              <Tpch resultFiles={resultFiles} explainFiles={explainFiles} />
            )}
            {selected === "sysbench" && <Sysbench files={resultFiles} />}
          </SysbenchContextProvider>
        </TpchContextProvider>
      </div>
    </div>
  );
}

export default Layout;
