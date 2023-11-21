import { useEffect, useRef } from "react";
import * as d3 from "d3";

const LineChart = (props) => {
  const lineplotSvg = useRef(null);

  const width = props.width;
  const height = 0.5 * document.body.clientHeight;
  const marginX = props.margin;
  const marginY = 50;

  const queryResults = props.queryResults;
  const randomNum = Math.floor(Math.random() * 1000)

  function drawLineChart(props) {
    const { chartSvg, data } = props;
    const svg = d3.select(chartSvg.current);

    svg.selectAll("*").remove(); // clear

    // create scales for x and y
    const xScale = d3
      .scaleLinear()
      .domain([d3.min(data, (d) => d.time), d3.max(data, (d) => d.time)])
      .range([marginX, width - marginY]);

    const yScale = d3
      .scaleLinear()
      .domain([d3.min(data, (d) => d.tps), d3.max(data, (d) => d.tps)])
      .range([height - marginY, marginX]);

    // create x and y axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    // draw x and y axes
    svg
      .append("g")
      .attr("transform", `translate(${0}, ${height - marginY})`)
      .call(xAxis);

    svg.append("g").attr("transform", `translate(${marginX}, 0)`).call(yAxis);

    // draw line
    const line = d3
      .line()
      .x((d) => xScale(d.time))
      .y((d) => yScale(d.tps));

    svg
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#4ab180")
      .attr("stroke-width", 1)
      .attr("d", line);
    console.log(data);
  }

  useEffect(() => {
    drawLineChart({
      chartSvg: lineplotSvg,
      data: queryResults,
    });
  }, [queryResults]);

  return (
    <div>
      <p className="title"> Average TPS: {randomNum} </p>
      <svg ref={lineplotSvg} width={width} height={height}></svg>
    </div>
  );
};

export default LineChart;
