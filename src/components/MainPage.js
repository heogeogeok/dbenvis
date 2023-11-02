import { useState } from "react";
import Sidebar from "./Sidebar";
import Tpch from "./tpch/Tpch";
import Sysbench from "./sysbench/Sysbench";

function MainPage() {
  const [selected, setSelected] = useState(null);
  const [files, setFiles] = useState([]);

  return (
    <div className="flex">
      <Sidebar
        selected={selected}
        setSelected={setSelected}
        files={files}
        setFiles={setFiles}
      />
      {selected === "TPC-H" && <Tpch files={files} />}
      {selected === "sysbench" && <Sysbench files={files} />}
    </div>
  );
}

export default MainPage;
