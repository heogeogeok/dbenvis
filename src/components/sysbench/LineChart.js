import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const LineChart = (props) => {
  const lineplotSvg = useRef(null);
  const gRef = useRef(null);

  const width = props.width;
  const height = 0.4 * document.documentElement.clientHeight;
  const margin = props.margin;

  const queryResults = props.queryResults;
  const avgTps = props.avgTps;
  const files = props.files;

  const [selectedX, setSelectedX] = useState(props.queryResults.time);
  const [selectedY, setSelectedY] = useState(props.queryResults.tps);

  function drawLineChart(props) {
    const { chartSvg, data, files } = props;
    const svg = d3.select(chartSvg.current);
    svg.selectAll("*").remove(); // clear

    // Add X axis
    const xScale = d3
      .scaleLinear()
      .domain([d3.min(data, (d) => d.time), d3.max(data, (d) => d.time)])
      .range([margin, width - margin]);
    const xAxis = svg
      .append("g")
      .attr("transform", `translate(0, ${height - margin})`)
      .call(d3.axisBottom(xScale));

    // Add Y axis
    const yScale = d3
      .scaleLinear()
      .domain([d3.min(data, (d) => d.tps), d3.max(data, (d) => d.tps)])
      .range([height - margin, margin]);
    const yAxis = svg
      .append("g")
      .attr("transform", `translate(${margin}, 0)`)
      .call(d3.axisLeft(yScale));

    // draw line
    const line = d3
      .line()
      .x((d) => xScale(d.time))
      .y((d) => yScale(d.tps));

    svg
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#ADD8E6")
      .attr("stroke-width", 1)
      .attr("d", line);

    // axis label 필요시 transform 조정 필요
    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height)
      .style("font", "14px times")
      .text(files[files.length - 1].name);

    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("x", -height / 2)
      .attr("y", 10)
      .attr("transform", "rotate(-90)")
      .style("font", "14px times")
      .text("TPS");

    // draw points
    const circle = svg
      .selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("fill", "#00008B")
      .attr("stroke", "none")
      .attr("cx", function (d) {
        return xScale(d.time);
      })
      .attr("cy", function (d) {
        return yScale(d.tps);
      })
      .attr("r", 0.5);

    const brush = d3
      .brush()
      .extent([
        [0, 0],
        [width, height],
      ])
      .on("end", updateChart);

    svg
      .append("g")
      .attr("transform", `tranlate(${margin}, ${margin})`)
      .call(brush);

    // A function that update the chart for given boundaries
    function updateChart({ selection }) {
      // If no selection, back to initial coordinate. Otherwise, update X axis domain
      let [[x0, y0], [x1, y1]] = selection;
      let extentX = [x0, x1];
      let extentY = [y0, y1];

      if (!selection) {
        xScale.domain([
          d3.min(data, (d) => d.time),
          d3.max(data, (d) => d.time),
        ]);
        yScale.domain([d3.min(data, (d) => d.tps), d3.max(data, (d) => d.tps)]);
      } else {
        xScale.domain([xScale.invert(extentX[0]), xScale.invert(extentX[1])]);
        yScale.domain([yScale.invert(extentY[0]), yScale.invert(extentY[1])]);
        svg.select(".brush").call(brush.move, null);
      }

      // Update axis and circle position
      xAxis.transition().duration(1000).call(d3.axisBottom(xScale));
      yAxis.transition().duration(1000).call(d3.axisLeft(yScale));
      svg
        .selectAll("circle")
        .transition()
        .duration(1000)
        .attr("cx", function (d) {
          return xScale(d.time);
        })
        .attr("cy", function (d) {
          return yScale(d.tps);
        });
    }
  }

  useEffect(() => {
    drawLineChart({
      chartSvg: lineplotSvg,
      data: queryResults,
      files: files,
    });
  }, [queryResults]);

  function constrain(transform, extent, translateExtent) {
    let dx0 = transform.invertX(extent[0][0]) - translateExtent[0][0],
      dx1 = transform.invertX(extent[1][0]) - translateExtent[1][0],
      dy0 = transform.invertY(extent[0][1]) - translateExtent[0][1],
      dy1 = transform.invertY(extent[1][1]) - translateExtent[1][1];
    return transform.translate(
      dx1 > dx0 ? (dx0 + dx1) / 2 : Math.min(0, dx0) || Math.max(0, dx1),
      dy1 > dy0 ? (dy0 + dy1) / 2 : Math.min(0, dy0) || Math.max(0, dy1)
    );
  }
  function filter(event) {
    return (!event.ctrlKey || event.type === "wheel") && !event.button;
  }

  return (
    <div>
      <div>
        <p className="subTitle"> Avg. TPS: {avgTps} </p>
        <svg
          id="dataviz_basicZoom"
          ref={lineplotSvg}
          width={width}
          height={height}
        ></svg>
      </div>
    </div>
  );
};

export default LineChart;
