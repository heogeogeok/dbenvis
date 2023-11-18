import MultiGraphCompare from "./MultiGraphComparer";
import { Card } from "@material-tailwind/react";

function Sysbench({ files }) {
  const size = 1000;
  const width = 430;
  const height = 200;
  const margin = 20;
  const radius = 1.5;
  const barPadding = 0.3;

  return;
  <div>
    <Card>
      <MultiGraphCompare
        files={files}
        size={size}
        width={width}
        height={height}
        margin={margin}
        radius={radius}
        barPadding={barPadding}
      />
    </Card>
  </div>;
}

export default Sysbench;
