import { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Tpch from "./tpch/Tpch";
import Sysbench from "./sysbench/Sysbench";

import "../App.css";

function Layout() {
  const [selected, setSelected] = useState(null); // 선택한 benchmark
  const [files, setFiles] = useState([]); // TODO: files가 여기 있는게 맞나?

  return (
    <div className="container">
      <Header />
      <div className="main-container">
        <Sidebar
          selected={selected}
          setSelected={setSelected}
          files={files}
          setFiles={setFiles}
        />
        {selected === "TPC-H" && <Tpch files={files} />}
        {selected === "sysbench" && <Sysbench files={files} />}
      </div>
    </div>
  );
}

export default Layout;
