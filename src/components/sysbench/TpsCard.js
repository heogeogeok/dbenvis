import { Card } from "@material-tailwind/react";

function TpsCard(props) {
  if (props.tps) {
    return (
      <Card className="tps-card">
        <div className="tps-card-content">
          <h1 className="tps-card-header">Average TPS</h1>
          <p>{props.tps.toFixed(2)}</p>
        </div>
      </Card>
    );
  }
}

export default TpsCard;
