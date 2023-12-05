import { useCallback, useEffect, useRef } from "react";
import * as d3 from "d3";

const nodeColor = d3
  .scaleOrdinal()
  .domain([
    "Limit",
    "Aggregate",
    "Gather",
    "Gather Merge",
    "Group",
    "Sort",
    "Order",
    "Seq Scan",
    "Index Scan",
    "Index Only Scan",
    "Full Index Scan",
    "Full Table Scan",
    "Unique Key Lookup",
    "Non-Unique Key Lookup",
    "Bitmap Heap Scan",
    "Bitmap Index Scan",
    "Nested Loop",
    "Hash Join",
    "Merge Join",
    "Attached Subqueries",
    "Hash",
    "Materialize",
  ])
  .range([
    "#fbb4ae",
    "#b3cde3",
    "#b3cde3",
    "#b3cde3",
    "#b3cde3",
    "#ccebc5",
    "#ccebc5",
    "#decbe4",
    "#decbe4",
    "#decbe4",
    "#decbe4",
    "#decbe4",
    "#decbe4",
    "#decbe4",
    "#decbe4",
    "#decbe4",
    "#fed9a6",
    "#fed9a6",
    "#fed9a6",
    "#ffffcc",
    "#e5d8bd",
    "#fddaec",
    "#f2f2f2",
  ]);

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

      // query cost 계산
      const cost = treeData.links().map((link) => {
        if (link.target.data["Total Cost"]) {
          // PostgreSQL
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

      // scale for stroke width
      const strokeWidthScale = d3
        .scaleLinear()
        .domain([d3.min(cost), d3.max(cost)])
        .range([1, 8]);

      const svg = d3
        .select(treeSvg.current)
        .append("svg")
        .attr("width", width)
        .attr("height", height + 2 * marginY)
        .append("g") // 그룹으로 묶어서
        .attr("transform", `translate(0, ${marginY})`) // margin 적용
        .call(
          d3.zoom().on("zoom", (event) => {
            svg.attr("transform", event.transform);
          })
        )
        .append("g");

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
        .attr("stroke-width", (d, i) => strokeWidthScale(cost[i]));

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
        .attr("width", (d) => d.data["Node Type"].length * 9)
        .attr("height", (d) =>
          d.data["Relation Name"] || d.data.table_name ? 40 : 25
        )
        .attr("rx", 5)
        .attr("transform", (d) => {
          let x = d.data["Node Type"].length * 9;
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

      // create tooltip
      var tooltip = d3
        .select("body")
        .append("div")
        .attr("class", "node-tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden");

      nodes
        .on("mouseover", function (event, d) {
          tooltip.html(tooltipContent(d)).style("visibility", "visible");
        })
        .on("mousemove", function (e) {
          tooltip
            .style("top", e.pageY - 30 + "px")
            .style("left", e.pageX + 10 + "px");
        })
        .on("mouseout", function () {
          tooltip.style("visibility", "hidden");
        });
    },
    [width, height, marginY]
  );

  useEffect(() => {
    d3.select(treeSvg.current).selectAll("*").remove(); // clear
    drawTree(props.plan);
  }, [props, drawTree]);

  function tooltipContent(d) {
    let content = `Node Type: ${d.data["Node Type"]}`;

    if (d.data["Total Cost"]) {
      // PostgreSQL
      if (d.data["Relation Name"]) {
        content += `<br>Relation Name: ${d.data[
          "Relation Name"
        ].toUpperCase()}`;
      }

      content += `<br>Cost: ${(
        d.data["Total Cost"] - d.data["Startup Cost"]
      ).toFixed(2)}<br>Plan Rows: ${d.data["Plan Rows"]}<br>Plan Width: ${
        d.data["Plan Width"]
      }`;
    } else if (d.data["cost_info"]) {
      // MySQL
      if (d.data["table_name"]) {
        content += `<br>Relation Name: ${d.data["table_name"].toUpperCase()}`;
      }

      const totalCost = Object.entries(d.data.cost_info || {})
        .filter(([key]) => key.includes("cost"))
        .map(([_, value]) => parseFloat(value) || 0);

      content += `<br>Cost: ${d3.sum(totalCost).toFixed(2)}`;
    }

    return content;
  }

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
