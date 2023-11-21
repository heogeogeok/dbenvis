import ParseQueryPlan from "./ParseQueryPlan";
import CompareView from "./CompareView";
import "../../assets/stylesheets/Tpch.css";
import { Card } from "@material-tailwind/react";

function Tpch(props) {
  const { resultFiles, explainFiles } = props;

  return (
    <div className="tpch-container">
      <div className="view-container">
        <Card className="tpch-card">
          <ParseQueryPlan files={explainFiles} />
        </Card>
      </div>
      <div className="view-container">
        <Card className="tpch-card">
          <CompareView files={resultFiles} />
        </Card>
      </div>
    </div>
  );
}

export default Tpch;
