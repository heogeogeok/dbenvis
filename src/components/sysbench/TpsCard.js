import { Card } from "@material-tailwind/react";

function TpsCard(props) {
  let data = 0;

  let headerText = "";

  if (props.metric === "tps") {
    data = props.average.tps;
    headerText = "Average TPS";
  } else if (props.metric === "qps") {
    data = props.average.qps;
    headerText = "Average QPS";
  } else if (props.metric === "lat") {
    data = props.average.lat.percentile99;
    headerText = "Average Latency";
  }

  if (props.average) {
    return (
      <Card className="tps-card">
        <div className="tps-card-content">
          <h1 className="tps-card-header">{headerText}</h1>
          <p>{data.toFixed(2)}</p>
        </div>
      </Card>
    );
  }
}

export default TpsCard;
