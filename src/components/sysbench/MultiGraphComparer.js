import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";

const MultiGraphComparer = ({ files, ...props }) => {
  const [contents, setContents] = useState([]);
  const [queryResults, setQueryResults] = useState([]);
  const lineplotSvg = useRef(null);

  const size = props.size;
  const width = props.width;
  const height = props.width;
  const margin = props.margin;
  const radius = props.radius;
  const barPadding = props.barPadding;

  const parseQueryResults = (fileContents) => {
    const results = [];
    const lines = fileContents.toString().split("\n");

    for (let line of lines) {
      // Stop at Latency histogram
      if (line.includes("Latency histogram (values are in milliseconds)")) {
        break;
      }

      const match = line.match(
        /\[\s*(\d+s)\s*\]\s*thds:\s*(\d+)\s*tps:\s*([\d.]+)\s*qps:\s*([\d.]+).*lat\s*\(ms,99%\):\s*([\d.]+)\s*err\/s:\s*([\d.]+)/
      );
      if (match) {
        const [_, time, thds, tps, qps, lat, errPerS] = match;
        results.push({
          time: parseInt(time),
          thds: parseInt(thds),
          tps: parseFloat(tps),
          qps: parseFloat(qps),
          lat: parseFloat(lat),
          errPerS: parseFloat(errPerS),
        });
      }
    }
    console.log(results);
    return results;
  };

  useEffect(() => {
    if (files && files.length > 0) {
      const fileContents = [];

      /* Create a FileReader for each file */
      files.forEach((file) => {
        const fileReader = new FileReader();

        fileReader.onload = () => {
          fileContents.push(fileReader.result);
          setContents(fileContents);
          // console.log(fileReader.result); // logging after reading file
        };

        /* Read the file as text */
        fileReader.readAsText(file);
      });
    }
  }, [files]);

  useEffect(() => {
    const extractedQueryResults = parseQueryResults(contents);
    setQueryResults(extractedQueryResults);
  }, [contents]);

  useEffect(() => {
    drawLineChart({
      chartSvg: lineplotSvg,
      data: queryResults,
      over: null,
      click: null,
      out: null,
    });
  }, [queryResults]);

  function drawLineChart(props) {
    const { chartSvg, data, over, click, out } = props;
    const svg = d3.select(chartSvg.current);

    svg.selectAll("*").remove(); //clear

    // x,y Scale
    // const xScale = d3.scaleLinear().range([0, width]);
    const xScale = d3
      .scaleBand()
      .domain(data.map((entry) => entry.time))
      .range([0, width]);

    const yScale = d3.range([height, 0]);

    // Draw x, y Axis
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg
      .append("g")
      .attr("transform", `translate(${margin}, ${margin + height})`)
      .call(xAxis);

    svg
      .append("g")
      .attr("transform", `translate(${margin}, ${margin})`)
      .call(yAxis);

    // Domain of x,y
    // xScale.domain(data.map((entry) => entry.time));
    // console.log("test", xScale(d[0]));
    yScale.domain([0, d3.max(data, (entry) => entry.tps)]);

    svg
      .selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", (d) => xScale(d.time))
      .attr("cy", (d) => yScale(d.tps))
      .attr("r", 1.5)
      .attr("fill", "black")
      .attr("transform", `translate(${margin}, ${margin})`);

    svg
      .selectAll("circle")
      .attr("class", (d, idx) => "scatterplot-point scatterplot-point-" + idx);

    // const line = d3
    //   .line()
    //   .x((d) => xScale(d.time))
    //   .y((d) => yScale(d.tps));

    // svg
    //   .select(".line")
    //   .datum(data)
    //   .append("g")
    //   .attr("fill", "none")
    //   .attr("stroke", "steelblue")
    //   .attr("stroke-width", 1.5)
    //   .attr("transform", `translate(${margin}, ${margin})`)
    //   .attr("d", line);
  }

  return (
    <div>
      <svg
        ref={lineplotSvg}
        width={width + 2 * margin}
        height={height + 2 * margin}
      ></svg>
    </div>
  );
};

export default MultiGraphComparer;
