import { useCallback, useEffect, useRef } from "react";
import * as d3 from "d3";

const QueryPlanView = (props) => {
  const treeSvg = useRef(null);

  const width = props.width;
  const height = 0.8 * document.body.clientHeight;
  const marginY = 50;

  const drawTree = useCallback(
    (data) => {
      const treeLayout = d3.tree().size([width, height]);

      // data를 d3의 계층 구조로 바꾸어주기
      const root = d3.hierarchy(data);
      const treeData = treeLayout(root);

      const nodeColor = d3.scaleOrdinal([
        "#fbb4ae",
        "#b3cde3",
        "#ccebc5",
        "#decbe4",
        "#fed9a6",
        "#ffffcc",
        "#e5d8bd",
        "#fddaec",
        "#f2f2f2",
      ]);

      const svg = d3
        .select(treeSvg.current)
        .append("svg")
        .attr("width", width)
        .attr("height", d3.max[(height, treeData.height * 60)] + 2 * marginY)
        .append("g") // 그룹으로 묶어서
        .attr("transform", `translate(0, ${marginY})`) // margin 적용
        .call(
          d3.zoom().on("zoom", (event) => {
            svg.attr("transform", event.transform);
          })
        )
        .append("g");

      const linkSums = treeData.links().map((link) => {
        if (
          // PostgreSQL
          link.target.data["Total Cost"] &&
          link.target.data["Startup Cost"]
        ) {
          return (
            link.target.data["Total Cost"] - link.target.data["Startup Cost"]
          );
        } else if (link.target.data.cost_info) {
          // MySQL
          const cost = Object.entries(link.target.data.cost_info || {})
            .filter(([key]) => key.includes("cost"))
            .map(([_, value]) => parseFloat(value) || 0);

          return d3.sum(cost);
        }

        return 0;
      });

      // Create a scale for stroke width based on the sum of all cost values
      const strokeWidthScale = d3
        .scaleLinear()
        .domain([d3.min(linkSums), d3.max(linkSums)])
        .range([1, 5]);

      // create edges with arrow markers
      svg
        .selectAll("line")
        .data(treeData.links())
        .enter()
        .append("line")
        .attr("x1", (d) => d.target.x)
        .attr("y1", (d) => d.target.y)
        .attr("x2", (d) => d.source.x)
        .attr("y2", (d) => d.source.y)
        .attr("stroke", "red")
        .attr("stroke-width", (d, i) => strokeWidthScale(linkSums[i]));

      // create nodes
      const nodes = svg
        .selectAll("g")
        .data(treeData.descendants())
        .enter()
        .append("g")
        .attr("transform", (d) => `translate(${d.x}, ${d.y})`);

      nodes
        .append("rect")
        .attr("fill", (d) => nodeColor(d.data["Node Type"]))
        .attr("width", (d) => d.data["Node Type"].length * 8)
        .attr("height", (d) =>
          d.data["Relation Name"] || d.data.table_name ? 40 : 25
        )
        .attr("rx", 5)
        .attr("transform", (d) => {
          let x = d.data["Node Type"].length * 8;
          return `translate(${-x / 2}, -10)`;
        });

      // append "Node Type" as node label
      nodes
        .append("text")
        .attr("dy", 7)
        .attr("text-anchor", "middle")
        .text((d) => d.data["Node Type"]);

      // append "Relation Name" or "table_name"
      nodes
        .append("text")
        .attr("class", "relation-name")
        .attr("dy", 22)
        .attr("text-anchor", "middle")
        .text((d) =>
          d.data["Relation Name"]
            ? d.data["Relation Name"].toUpperCase()
            : d.data.table_name
            ? d.data.table_name.toUpperCase()
            : null
        );
    },
    [width, height, marginY]
  );

  useEffect(() => {
    d3.select(treeSvg.current).selectAll("*").remove(); // clear
    drawTree(props.plan);
  }, [props, drawTree]);

  return (
    <div>
      <svg
        className="node-label"
        ref={treeSvg}
        width={width}
        height={height + 2 * marginY}
      ></svg>
    </div>
  );
};

export default QueryPlanView;
