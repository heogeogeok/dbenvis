import { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Tpch from "./tpch/Tpch";
import Sysbench from "./sysbench/Sysbench";
import "../App.css";

function Layout() {
  const [selected, setSelected] = useState(null); // 선택한 benchmark

  const [resultFiles, setResultFiles] = useState([]);
  const [explainFiles, setExplainFiles] = useState([]);

  return (
    <div className="container">
      <Header />
      <div className="main-container">
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
      </div>
    </div>
  );
}

export default Layout;
