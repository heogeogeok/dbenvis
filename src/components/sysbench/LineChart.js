import { useEffect, useRef, useContext } from "react";
import { SysbenchContext } from "../../contexts/SysbenchContext";
import * as d3 from "d3";
import TpsCard from "./TpsCard";

const LineChart = (props) => {
  const { fileIndex, files, queryResults } = props;
  const { avgTps, setAvgTps } = useContext(SysbenchContext);

  const lineplotSvg = useRef(null);

  const width =
    (0.8 * document.documentElement.clientWidth) / props.files.length;
  const height = 0.4 * document.documentElement.clientHeight;
  const margin = 0.03 * document.documentElement.clientWidth;

  useEffect(() => {
    const svg = d3.select(lineplotSvg.current);
    svg.selectAll("*").remove(); // clear

    // create scales for x and y
    const xScale = d3
      .scaleLinear()
      .domain([
        d3.min(queryResults, (d) => d.time),
        d3.max(queryResults, (d) => d.time),
      ])
      .range([margin, width - margin]);

    const yScale = d3
      .scaleLinear()
      .domain([
        d3.min(queryResults, (d) => d.tps),
        d3.max(queryResults, (d) => d.tps),
      ])
      .range([height - margin, margin]);

    // color scale to match the line color with bar
    const colorScale = d3
      .scaleOrdinal()
      .domain(files.map((entry, index) => index))
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

    // draw x and y axes
    const xAxis = svg
      .append("g")
      .attr("transform", `translate(0, ${height - margin})`)
      .call(d3.axisBottom(xScale));

    const yAxis = svg
      .append("g")
      .attr("transform", `translate(${margin}, 0)`)
      .call(d3.axisLeft(yScale));

    // add clippath - 선이 밖으로 빠져나오지 않게 해주는 역할
    var clip = svg
      .append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr("width", width - margin)
      .attr("height", height - margin)
      .attr("x", margin)
      .attr("y", margin);

    // draw line
    const line = svg
      .append("g")
      .attr("clip-path", "url(#clip)")
      .append("g")
      .append("path")
      .datum(queryResults)
      .attr("fill", "none")
      .attr("stroke", colorScale(fileIndex))
      .attr(
        "d",
        d3
          .line()
          .x((d) => xScale(d.time))
          .y((d) => yScale(d.tps))
      );

    // add brush
    const brush = d3
      .brushX()
      .extent([
        [margin, margin],
        [width - margin, height - margin],
      ])
      .on("end", updateChart);

    svg.append("g").attr("class", "brush").call(brush);

    function updateChart(event) {
      const extent = event.selection;

      if (extent) {
        xScale.domain([xScale.invert(extent[0]), xScale.invert(extent[1])]);
        svg.select(".brush").call(brush.move, null); // 브러시 영역 숨기기

        // // filter brushed data
        // const brushedData = queryResults.filter((d) => {
        //   return (
        //     xScale.invert(extent[0]) <= d.time &&
        //     d.time <= xScale.invert(extent[1])
        //   );
        // });

        // svg.classed("selected", (d) => brushedData.includes(d));
        // d3.selectAll(".scatterplot-point").classed("selected", false);

        // brushedData.forEach((d) => {
        //   d3.selectAll(`.scatterplot-point-${queryResults.indexOf(d)}`).classed(
        //     "selected",
        //     true
        //   );
        // });
      }

      // update axis
      xAxis.transition().duration(1000).call(d3.axisBottom(xScale));

      // update line
      line
        .transition()
        .duration(1000)
        .attr(
          "d",
          d3
            .line()
            .x(function (d) {
              return xScale(d.time);
            })
            .y(function (d) {
              return yScale(d.tps);
            })
        );
    }

    // reinitialize the chart on double click
    svg.on("dblclick", function () {
      xScale.domain([
        d3.min(queryResults, (d) => d.time),
        d3.max(queryResults, (d) => d.time),
      ]);
      xAxis.transition().call(d3.axisBottom(xScale));

      line.transition().attr(
        "d",
        d3
          .line()
          .x(function (d) {
            return xScale(d.time);
          })
          .y(function (d) {
            return yScale(d.tps);
          })
      );
    });
  });

  return (
    <div>
      {files[fileIndex] && files[fileIndex].name ? (
        <div className="filename-title">
          <p>
            {files[fileIndex].name.length > 80 / files.length
              ? `${files[fileIndex].name.slice(0, 80 / files.length)}...`
              : files[fileIndex].name}
          </p>
        </div>
      ) : null}
      <TpsCard tps={avgTps[fileIndex]} />
      <svg ref={lineplotSvg} width={width} height={height}></svg>
    </div>
  );
};

export default LineChart;
