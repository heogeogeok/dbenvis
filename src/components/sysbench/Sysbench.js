import ParseResult from "./ParseResult";
import BarChart from "./BarChart";
import "../../assets/stylesheets/Sysbench.css";
import { Card } from "@material-tailwind/react";

function Sysbench(props) {
  return (
    <div>
      <div>
        <ParseResult files={props.files} />
      </div>
    </div>
  );
}

export default Sysbench;
