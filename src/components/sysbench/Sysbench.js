import ParseResult from "./ParseResult";
import BarChart from "./BarChart";
import "../../assets/stylesheets/Sysbench.css";
import { Card } from "@material-tailwind/react";

function Sysbench(props) {
  return (
    <div className="sysbench-container">
      <div className="view-container">
        <Card>
          <ParseResult files={props.files} />
        </Card>
      </div>
      <div className="view-container">
        <Card>
          <BarChart files={props.files} />
        </Card>
      </div>
    </div>
  );
}

export default Sysbench;
