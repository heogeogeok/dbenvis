import * as d3 from "d3";
import { useRef, useEffect, useState } from "react";

const BarChart = ({ files, ...props }) => {
  const barplotSvg = useRef(null);

  const width = document.body.clientWidth * 0.3;
  const height = 200;
  const marginX = document.body.clientWidth * 0.05;
  const marginY = 30;
  const barPadding = 0.3;

  const [queryResults, setQueryResults] = useState([]);

  const dbname = ["PostgreSQL", "MariaDB", "SQL Server", "MySQL"];

  useEffect(() => {
    const loadFiles = async () => {
      if (files && files.length > 0) {
        const fileContents = [];

        let i = 0;

        for (const file of files) {
          const fileContent = await readFile(file);
          const results = extractAvgTps(fileContent);

          fileContents.push({ name: dbname[i], transactionsPerSec: results });
          i++;
        }

        setQueryResults(fileContents);
      } else {
        // 업로드 한 파일 없는 경우
        setQueryResults([]);
      }
    };

    loadFiles();
  }, [files]);

  const readFile = (file) => {
    return new Promise((resolve) => {
      const fileReader = new FileReader();

      fileReader.onload = () => {
        resolve(fileReader.result);
      };

      // read the file as text
      fileReader.readAsText(file);
    });
  };

  /* input preprocessinge */
  const extractAvgTps = (content) => {
    const regex = /transactions:\s+\d+\s+\(([\d.]+)\s+per sec.\)/;
    const match = content.match(regex);

    if (match) {
      const transactionsPerSec = parseFloat(match[1]); // per sec 값 추출
      return transactionsPerSec;
    } else {
      console.error("Unable to extract average from the content");
      return null;
    }
  };

  useEffect(() => {
    drawBarChart({
      chartSvg: barplotSvg,
      data: queryResults,
    });
  }, [queryResults]);

  function drawBarChart(props) {
    const { chartSvg, data } = props;
    const svg = d3.select(chartSvg.current);

    svg.selectAll("*").remove(); // clear

    // create scales for x and y
    const xScale = d3
      .scaleBand()
      .domain(data.map((entry) => entry.name))
      .range([0, width])
      .align(0.5)
      .padding(barPadding);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.transactionsPerSec)])
      .range([height, 0]);

    const colorScale = d3
      .scaleOrdinal()
      .domain(data.map((entry) => entry.name))
      .range(d3.schemeCategory10);

    // create x and y axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    // draw x and y axes
    svg
      .append("g")
      .attr("transform", `translate(${marginX}, ${height + marginY})`)
      .call(xAxis);

    svg
      .append("g")
      .attr("transform", `translate(${marginX}, ${marginY})`)
      .call(yAxis);

    // draw bars
    svg
      .append("g")
      .selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", (d) => xScale(d.name) + marginX)
      .attr("y", (d) => yScale(d.transactionsPerSec) + marginY)
      .attr("width", xScale.bandwidth())
      .attr("height", (d) => height - yScale(d.transactionsPerSec))
      .attr("fill", (d) => colorScale(d.name));
  }
  return (
    <>
      <h1 className="title">Average TPS</h1>
      <svg
        ref={barplotSvg}
        width={width + 2 * marginX}
        height={height + 2 * marginY}
      ></svg>
    </>
  );
};

export default BarChart;
