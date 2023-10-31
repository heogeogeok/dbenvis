import Sidebar from "./Sidebar";
import Tpch from "./tpch/Tpch";

function MainPage() {
  return (
    <div className="flex">
      <Sidebar />
      <Tpch />
    </div>
  );
}

export default MainPage;
