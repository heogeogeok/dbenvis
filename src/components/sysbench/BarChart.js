import { useRef, useEffect, useContext } from "react";
import { SysbenchContext } from "../../contexts/SysbenchContext";
import * as d3 from "d3";
import { shadeColor } from "../tpch/mapping";
import Select from "react-select";

const BarChart = ({ files }) => {
  const { avgMetric, selectedMetric, setselectedMetric } =
    useContext(SysbenchContext);

  const options = [
    { value: "tps", label: "TPS" },
    { value: "qps", label: "QPS" },
    { value: "lat", label: "Latency" },
  ];

  const barplotSvg = useRef(null);

  const width = document.body.clientWidth * 0.3;
  const height = 200;
  const marginX = document.body.clientWidth * 0.25;
  const marginY = 30;

  function getMetricValue(d) {
    switch (selectedMetric) {
      case "tps":
        return d.tps;
      case "qps":
        return d.qps;
      case "lat":
        return d.lat.percentile99;
      default:
        return d.tps;
    }
  }

  const handleSelectionChange = (selectedOption) => {
    setselectedMetric(selectedOption.value);
  };

  useEffect(() => {
    const svg = d3.select(barplotSvg.current);
    svg.selectAll("*").remove(); // clear

    // create scales for x and y
    const xScale = d3
      .scaleBand()
      .domain(avgMetric.map((entry, index) => index))
      .range([0, width])
      .align(0.5)
      .padding(0.1);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(avgMetric, (d) => getMetricValue(d))])
      .range([height, 0]);

    // create color scale for each bars in the group
    const colorScale = d3
      .scaleOrdinal()
      .domain(avgMetric.map((entry, index) => index))
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

    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "bar-tooltip");

    // draw bars
    svg
      .append("g")
      .selectAll()
      .data(avgMetric)
      .join("rect")
      .attr("x", (d) => xScale(d.index) + marginX)
      .attr("y", height + marginY) // transition: 초기 y position 맨 아래에
      .attr("width", xScale.bandwidth())
      .attr("height", 0) // transition: 초기 height 0
      .attr("fill", (d) => colorScale(d.index))
      .on("mouseover", function (event, d) {
        tooltip
          .html(
            `Average TPS: ${d.tps.toFixed(2)}<br>Average QPS: ${d.qps.toFixed(
              2
            )}<br>Average Latency: ${d.lat.percentile99.toFixed(2)}`
          )
          .style("visibility", "visible");
        d3.select(this).attr("fill", (d) =>
          shadeColor(colorScale(d.index), -15)
        );
      })
      .on("mousemove", function (e) {
        tooltip
          .style("top", e.pageY + 10 + "px")
          .style("left", e.pageX + 10 + "px");
      })
      .on("mouseout", function () {
        tooltip.html(``).style("visibility", "hidden");
        d3.select(this).attr("fill", (d) => colorScale(d.index));
      })
      .transition()
      .duration(1000)
      .attr("y", (d) => yScale(getMetricValue(d)) + marginY) // transition: final y position
      .attr("height", (d) => height - yScale(getMetricValue(d))); // transition: final height
  });

  return (
    <div>
      <div className="control-panel justify-start ml-8">
        <div className="control-panel-metric">
          <p>Choose Metric:</p>
          <Select
            options={options}
            defaultValue={options[0]}
            onChange={handleSelectionChange}
            className="control-panel-options"
          />
        </div>
      </div>
      <svg
        ref={barplotSvg}
        width={width + 2 * marginX}
        height={height + 2 * marginY}
      ></svg>
    </div>
  );
};

export default BarChart;
