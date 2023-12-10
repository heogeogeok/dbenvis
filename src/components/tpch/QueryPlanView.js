import { useCallback, useEffect, useRef } from "react";
import * as d3 from "d3";
import { nodeColor, PostgresToMySQL, MySqlToPostgres } from "./mapping";

const QueryPlanView = (props) => {
  const treeSvg = useRef(null);

  const width = props.width;
  const height = 600;
  const marginY = 35;

  const drawTree = useCallback(
    (data, term, metric) => {
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
        } else if (link.target.data["r_total_time_ms"]) {
          // MariaDB
          return link.target.data["r_total_time_ms"];
        }
        return 0;
      });

      // # of rows 계산
      const rows = treeData.links().map((link) => {
        if (link.target.data["Plan Rows"]) {
          // PostgreSQL
          return link.target.data["Plan Rows"];
        } else if (link.target.data.cost_info) {
          // MySQL
          const rows = Object.entries(link.target.data || {})
            .filter(([key]) => key.includes("rows"))
            .map(([_, value]) => value || 0);

          return d3.sum(rows);
        } else if (link.target.data["r_total_time_ms"]) {
          // MariaDB
          return link.target.data["rows"];
        }
        return 0;
      });

      // scale for stroke width
      const strokeWidthScale = d3
        .scaleLinear()
        .domain([d3.min(cost), d3.max(cost)])
        .range([1, 8]);

      const rowScale = d3
        .scaleLinear()
        .domain([d3.min(rows), d3.max(rows)])
        .range([10, 25]);

      const costScale = d3
        .scaleLinear()
        .domain([d3.min(cost), d3.max(cost)])
        .range([10, 25]);

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
        .append("circle")
        .transition()
        .duration(1000)
        .attr("fill", (d) => nodeColor(d.data["Node Type"]))
        .attr("r", (d, i) => {
          if (metric === "cost") {
            return costScale(cost[i - 1]);
          } else if (metric === "row") {
            return rowScale(rows[i - 1]);
          } else {
            return 20;
          }
        });

      // append "Node Type" as node label
      nodes
        .append("text")
        .attr("dy", 7)
        .attr("text-anchor", "middle")
        .text((d) => {
          if (term === "MariaDB / MySQL")
            return PostgresToMySQL[d.data["Node Type"]] || d.data["Node Type"];
          else if (term === "PostgreSQL")
            return MySqlToPostgres[d.data["Node Type"]] || d.data["Node Type"];
          else return d.data["Node Type"];
        });

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
        .attr("id", "tooltip")
        .attr("class", "node-tooltip");

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

    drawTree(props.plan, props.term, props.selectedOption);
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
