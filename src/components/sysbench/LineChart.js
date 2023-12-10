import { useEffect, useRef, useContext } from "react";
import { SysbenchContext } from "../../contexts/SysbenchContext";
import * as d3 from "d3";
import TpsCard from "./TpsCard";

const LineChart = (props) => {
  const { fileIndex, files, queryResults, initAvgMetric } = props;
  const { avgMetric, setAvgMetric, selectedMetric } =
    useContext(SysbenchContext);

  const lineplotSvg = useRef(null);

  const width =
    (0.8 * document.documentElement.clientWidth) / props.files.length;
  const height = 350;
  const margin = 0.03 * document.documentElement.clientWidth;

  function getMetricValue(d) {
    switch (selectedMetric) {
      case "tps":
        return d.tps;
      case "qps":
        return d.qps;
      case "lat":
        return d.lat;
      default:
        return d.tps;
    }
  }

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
        d3.min(queryResults, (d) => getMetricValue(d)),
        d3.max(queryResults, (d) => getMetricValue(d)),
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

    svg
      .append("g")
      .attr("transform", `translate(${margin}, 0)`)
      .call(d3.axisLeft(yScale));

    // add clippath - 선이 밖으로 빠져나오지 않게 해주는 역할
    svg
      .append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr("width", width - 2 * margin)
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
          .y((d) => yScale(getMetricValue(d)))
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
        // filter brushed data
        const brushedData = queryResults.filter((d) => {
          return (
            xScale.invert(extent[0]) <= d.time &&
            d.time <= xScale.invert(extent[1])
          );
        });

        // 새로운 average 계산
        const newAvgMetric = [...avgMetric];
        let sum = 0;
        brushedData.forEach((d) => {
          sum += getMetricValue(d);
        });

        if (selectedMetric === "tps")
          newAvgMetric[fileIndex].tps = sum / brushedData.length;
        else if (selectedMetric === "qps")
          newAvgMetric[fileIndex].qps = sum / brushedData.length;
        else if (selectedMetric === "lat")
          newAvgMetric[fileIndex].lat.percentile99 = sum / brushedData.length;

        setAvgMetric(newAvgMetric);

        xScale.domain([xScale.invert(extent[0]), xScale.invert(extent[1])]);

        svg.select(".brush").call(brush.move, null); // 브러시 영역 숨기기
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
              return yScale(getMetricValue(d));
            })
        );
    }

    // reinitialize the chart on double click
    svg.on("dblclick", function () {
      setAvgMetric(initAvgMetric);

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
            return yScale(getMetricValue(d));
          })
      );
    });
  }, [selectedMetric]);

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
      <TpsCard average={avgMetric[fileIndex]} metric={selectedMetric} />
      <svg ref={lineplotSvg} width={width} height={height}></svg>
    </div>
  );
};

export default LineChart;
