import { useRef, useEffect, useState } from "react";
import * as d3 from "d3";

const CompareView = ({ files }) => {
  const barplotSvg = useRef(null);
  const selectedSvg = useRef(null);

  const width = 450;
  const height = 200;
  const marginX = 50;
  const marginY = 20;
  const barPadding = 0.3;

  const [contents, setContents] = useState([]);
  const [duration, setDuration] = useState([]);
  const [selectedQuery, setSelectedQuery] = useState({});

  function onMouseOver() {
    d3.select(this).transition().duration(200).style("fill", "#2a9453");
  }
  function onMouseClick(e) {
    setSelectedQuery(e.target.__data__);
  }
  function onMouseOut() {
    d3.select(this).transition().duration(200).style("fill", "#4ab180");
  }

  useEffect(() => {
    if (files && files.length === 0) {
      // 업로드 한 파일 없는 경우
      setContents([]);
      setSelectedQuery({});
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

  /* input preprocessing */
  useEffect(() => {
    const queryTimes = [];

    const regex = /Query (\d+) \*\*[\s\S]+?Time: (\d+\.\d+) ms/g;
    let match = regex.exec(contents);

    while (match !== null) {
      const queryNumber = match[1];
      const timeInSeconds = parseFloat(match[2]) / 1000;

      queryTimes.push({ queryNumber, timeInSeconds });

      match = regex.exec(contents);
    }

    setDuration(queryTimes);
  }, [contents]);

  /* 모든 query에 대한 bar chart */
  useEffect(() => {
    drawBarChart({
      chartSvg: barplotSvg,
      data: duration,
      over: onMouseOver,
      click: onMouseClick,
      out: onMouseOut,
    });
  }, [duration]);

  /* 선택한 query에 대한 bar chart */
  useEffect(() => {
    drawBarChart({
      chartSvg: selectedSvg,
      data: [selectedQuery],
      over: null,
      click: null,
      out: null,
    });
  }, [selectedQuery]);

  function drawBarChart(props) {
    const { chartSvg, data, over, click, out } = props;
    const svg = d3.select(chartSvg.current);

    svg.selectAll("*").remove(); // clear

    // create scales for x and y
    const xScale = d3
      .scaleBand()
      .domain(data.map((entry) => entry.queryNumber))
      .range([0, width])
      .align(0.5)
      .padding(barPadding);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (entry) => entry.timeInSeconds)])
      .range([height, 0]);

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
      .join("rect")
      .attr("x", (d) => xScale(d.queryNumber) + marginX)
      .attr("y", (d) => yScale(d.timeInSeconds) + marginY)
      .attr("width", xScale.bandwidth())
      .attr("height", (d) => height - yScale(d.timeInSeconds))
      .attr("fill", "#4ab180")
      .on("mouseover", over)
      .on("mouseout", out)
      .on("click", click);
  }

  return (
    <>
      <h1 className="title">Duration</h1>
      {contents.length > 0 && (
        <>
          <div className="chart-container">
            <svg
              ref={barplotSvg}
              width={width + 2 * marginX}
              height={height + 2 * marginY}
            ></svg>
          </div>
          {selectedQuery.queryNumber >= 1 &&
            selectedQuery.queryNumber <= 21 && (
              <div className="chart-container">
                <h1 className="title">
                  Query {selectedQuery.queryNumber} Duration
                </h1>
                <svg
                  ref={selectedSvg}
                  width={width + 2 * marginX}
                  height={height + 2 * marginY}
                />
              </div>
            )}
        </>
      )}
    </>
  );
};

export default CompareView;
