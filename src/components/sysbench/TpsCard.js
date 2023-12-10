import { Card } from "@material-tailwind/react";

function TpsCard(props) {
  let data = 0;

  if (props.metric === "tps") data = props.average.tps;
  else if (props.metric === "qps") data = props.average.qps;
  else if (props.metric === "lat") data = props.average.lat.percentile99;

  if (props.average) {
    return (
      <Card className="tps-card">
        <div className="tps-card-content">
          <h1 className="tps-card-header">Average TPS</h1>
          <p>{data.toFixed(2)}</p>
        </div>
      </Card>
    );
  }
}

export default TpsCard;
