import ParseResult from "./ParseResult";
import "../../assets/stylesheets/Sysbench.css";

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
