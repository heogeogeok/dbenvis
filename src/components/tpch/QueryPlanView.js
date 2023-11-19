import { useEffect, useRef } from "react";
import * as d3 from "d3";

const QueryPlanView = (props) => {
  const treeSvg = useRef(null);

  const width = 500;
  const height = 600;

  function drawTree(data) {
    const svg = d3
      .select(treeSvg.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const treeLayout = d3.tree().size([300, 300]);
    const root = d3.hierarchy(data);
    const treeData = treeLayout(root);

    // create edges
    svg
      .selectAll("line")
      .data(treeData.links())
      .enter()
      .append("line")
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y)
      .attr("stroke", "black");

    // create nodes
    const nodes = svg
      .selectAll("g")
      .data(treeData.descendants())
      .enter()
      .append("g")
      .attr("transform", (d) => `translate(${d.x},${d.y})`);

    nodes.append("circle").attr("r", 5).attr("fill", "red");

    // append "Node Type" as node label
    nodes
      .append("text")
      .attr("dy", -10)
      .attr("text-anchor", "middle")
      .text((d) => d.data["Node Type"]);
  }

  useEffect(() => {
    drawTree(props.plan);
  }, [props]);

  return <svg ref={treeSvg} width={600} height={height}></svg>;
};

export default QueryPlanView;
