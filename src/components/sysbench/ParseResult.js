import { useRef, useEffect, useState } from "react";
import * as d3 from "d3";

const ParseResult = ({ files }) => {
  const lineplotSvg = useRef(null);

  const width = 500;
  const height = 300;
  const marginX = 50;
  const marginY = 20;

  const [contents, setContents] = useState([]);
  const [queryResults, setQueryResults] = useState([]);

  useEffect(() => {
    if (files && files.length === 0) {
      // 업로드 한 파일 없는 경우
      setContents([]);
    } else if (files && files.length > 0) {
      const fileContents = [];

      // create a FileReader for each file
      files.forEach((file) => {
        const fileReader = new FileReader();

        fileReader.onload = () => {
          fileContents.push(fileReader.result);
          setContents(fileContents);
        };

        // read the file as text
        fileReader.readAsText(file);
      });
    }
  }, [files]);

  useEffect(() => {
    const results = [];
    const lines = contents.toString().split("\n");

    for (let line of lines) {
      // Stop at Latency histogram
      if (line.includes("Latency histogram (values are in milliseconds)")) {
        break;
      }

      const match = line.match(
        /\[\s*(\d+s)\s*\]\s*thds:\s*(\d+)\s*tps:\s*([\d.]+)\s*qps:\s*([\d.]+).*lat\s*\(ms,99%\):\s*([\d.]+)\s*err\/s:\s*([\d.]+)/
      );
      if (match) {
        const [_, time, thds, tps, qps, lat, err] = match;
        results.push({
          time: parseInt(time),
          tps: parseFloat(tps),
          qps: parseFloat(qps),
          lat: parseFloat(lat),
        });
      }
    }

    setQueryResults(results);
  }, [contents]);

  /* TODO: line chart 그리는 LineChart.js 만들어서 분리하기 */
  useEffect(() => {
    drawLineChart({
      chartSvg: lineplotSvg,
      data: queryResults,
    });
  }, [queryResults]);

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
  }

  return (
    <div>
      <h1 className="title">Benchmark Result</h1>
      {contents.length > 0 && (
        <svg
          ref={lineplotSvg}
          width={width + 2 * marginX}
          height={height + 2 * marginY}
        ></svg>
      )}
    </div>
  );
};

export default ParseResult;
