import { Card } from "@material-tailwind/react";

function DurationCard(props) {
  if (props.duration) {
    return (
      <Card className="duration-card">
        <div className="duration-card-content">
          <h1 className="duration-card-header">Duration</h1>
          <p>{props.duration.duration.toFixed(1)} sec</p>
        </div>
      </Card>
    );
  }
}

export default DurationCard;
