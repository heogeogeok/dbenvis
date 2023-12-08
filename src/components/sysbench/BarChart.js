import { useRef, useEffect, useContext } from "react";
import { SysbenchContext } from "../../contexts/SysbenchContext";
import * as d3 from "d3";

const BarChart = ({ files }) => {
  const { avgTps } = useContext(SysbenchContext);

  const barplotSvg = useRef(null);

  const width = document.body.clientWidth * 0.3;
  const height = 200;
  const marginX = document.body.clientWidth * 0.25;
  const marginY = 30;

  useEffect(() => {
    const svg = d3.select(barplotSvg.current);
    svg.selectAll("*").remove(); // clear

    // create scales for x and y
    const xScale = d3
      .scaleBand()
      .domain(avgTps.map((entry, index) => index))
      .range([0, width])
      .align(0.5)
      .padding(0.1);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(avgTps)])
      .range([height, 0]);

    // create color scale for each bars in the group
    const colorScale = d3
      .scaleOrdinal()
      .domain(avgTps.map((entry, index) => index))
      .range([
        "#7fc97f",
        "#beaed4",
        "#fdc086",
        "#ffff99",
        "#386cb0",
        "#f0027f",
        "#bf5b17",
        "#666666",
      ]);

    // create x and y axes
    const xAxis = d3.axisBottom(xScale).tickFormat((index) => {
      // 파일 이름이 긴 경우 truncate
      if (files[index]) {
        const tick =
          files[index].name.length > 45 / files.length
            ? `${files[index].name.slice(0, 45 / files.length)}...`
            : files[index].name;
        return tick;
      }
    });
    const yAxis = d3.axisLeft(yScale);

    // draw x and y axes
    svg
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(${marginX}, ${height + marginY})`)
      .transition()
      .duration(1000)
      .call(xAxis);

    svg
      .append("g")
      .attr("class", "y-axis")
      .attr("transform", `translate(${marginX}, ${marginY})`)
      .transition()
      .duration(1000)
      .call(yAxis);

    // draw bars
    svg
      .append("g")
      .selectAll()
      .data(avgTps)
      .join("rect")
      .attr("x", (d, index) => xScale(index) + marginX)
      .attr("y", height + marginY) // transition: 초기 y position 맨 아래에
      .attr("width", xScale.bandwidth())
      .attr("height", 0) // transition: 초기 height 0
      .attr("fill", (d, index) => colorScale(index))
      .transition()
      .duration(1000)
      .attr("y", (d) => yScale(d) + marginY) // transition: final y position
      .attr("height", (d) => height - yScale(d)); // transition: final height
  });

  return (
    <div>
      <svg
        ref={barplotSvg}
        width={width + 2 * marginX}
        height={height + 2 * marginY}
      ></svg>
    </div>
  );
};

export default BarChart;
