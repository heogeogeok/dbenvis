import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const LineChart = (props) => {
  const lineplotSvg = useRef(null);

  const width = props.width;
  const height = 0.4 * document.documentElement.clientHeight;
  const margin = props.margin;

  const queryResults = props.queryResults;
  // const avgTps = props.avgTps;
  const files = props.files;

  const [avgTps, setAvgTps] = useState(props.avgTps);

  const triggerAvgTps = (brushed) => {
    setAvgTps(brushed);
    props.parentCallbackAvgTps(brushed);
  };

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

    const clip = svg
      .append("defs")
      .append("svg:clipPath")
      .attr("id", "clip")
      .append("svg:rect")
      .attr("width", width)
      .attr("height", height)
      .attr("x", 0)
      .attr("y", 0);

    // brush
    const brush = d3
      .brushX()
      .extent([
        [0, 0],
        [width, height],
      ])
      .on("end", updateChart);

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

    // draw line
    const line = svg
      .append("g")
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#ADD8E6")
      .attr("stroke-width", 1)
      .attr(
        "d",
        d3
          .line()
          .x((d) => xScale(d.time))
          .y((d) => yScale(d.tps))
      );

    svg.append("g").call(brush);

    // A function that set idleTimeOut to null
    let idleTimeOut;
    function idled() {
      idleTimeOut = null;
    }

    // A function that update the chart for given boundaries
    function updateChart(event) {
      // If no selection, back to initial coordinate. Otherwise, update X axis domain
      const extent = event.selection;

      if (!extent) {
        if (!idleTimeOut) return (idleTimeOut = setTimeout(idled, 350)); // This allows to wait a little bit
        xScale.domain([
          xScale([d3.min(data, (d) => d.time)]),
          xScale(d3.max(data, (d) => d.time)),
        ]);
        svg.classed("selected", false);
      } else {
        xScale.domain([xScale.invert(extent[0]), xScale.invert(extent[1])]);
        svg.select(".brush").call(brush.move, null); // 브러시 영역 숨기기

        // filtering brushed data
        const brushedData = data.filter((d) => {
          return (
            xScale.invert(extent[0]) <= d.time &&
            d.time <= xScale.invert(extent[1])
          );
        });

        svg.classed("selected", (d) => brushedData.includes(d));
        d3.selectAll(".scatterplot-point").classed("selected", false);

        console.log(brushedData);
        brushedData.forEach((d) => {
          d3.selectAll(`.scatterplot-point-${data.indexOf(d)}`).classed(
            "selected",
            true
          );
        });
      }
      // Update axis and circle position
      xAxis.transition().duration(1000).call(d3.axisBottom(xScale));

      // 무조건 function 방식으로 작성
      circle
        .transition()
        .duration(1000)
        .attr("cx", function (d) {
          return xScale(d.time);
        })
        .attr("cy", function (d) {
          return yScale(d.tps);
        });

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

      // svg.select(".brush").remove();
    }
    // If user double click, reinitialize the chart
    svg.on("dblclick", function () {
      xScale.domain([d3.min(data, (d) => d.time), d3.max(data, (d) => d.time)]);
      xAxis.transition().call(d3.axisBottom(xScale));

      circle
        .transition()
        .attr("cx", function (d) {
          return xScale(d.time);
        })
        .attr("cy", function (d) {
          return yScale(d.tps);
        });

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
  }

  useEffect(() => {
    drawLineChart({
      chartSvg: lineplotSvg,
      data: queryResults,
      files: files,
    });
  }, [lineplotSvg, queryResults, files]);

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
