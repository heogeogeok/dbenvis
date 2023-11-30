import { useRef, useEffect, useState, useContext } from "react";
import * as d3 from "d3";
import { TpchContext } from "../../contexts/TpchContext";

const CompareView = ({ files }) => {
  const { selectedQuery, setSelectedQuery } = useContext(TpchContext);

  const barplotSvg = useRef(null);
  const selectedSvg = useRef(null);

  const width = document.body.clientWidth * 0.4;
  const height = 300;
  const marginX = document.body.clientWidth * 0.01;
  const marginY = 20;

  const selectedWidth = document.body.clientWidth * 0.2;
  const selectedHeight = 300;
  const selectedMarginX = document.body.clientWidth * 0.1;

  const [contents, setContents] = useState([]);
  const [duration, setDuration] = useState([]);
  const [datasets, setDatasets] = useState([]);

  function onMouseOver() {
    // Save the original color
    const originalColor = d3.select(this).attr("fill");

    // Transition to the darker color
    d3.select(this)
      .transition()
      .duration(200)
      .style("fill", darkenColor(originalColor));
  }
  function onMouseClick(e) {
    const selected = e.target.__data__;

    if (selected) setSelectedQuery(selected.queryNumber - 1);
  }
  function onMouseOut() {
    d3.select(this)
      .transition()
      .duration(200)
      .style("fill", (d) => d3.select(this).attr("fill"));
  }

  function darkenColor(color) {
    const colorScale = d3
      .scaleLinear()
      .domain([0, 1])
      .range(["#4ab180", "#2a9453"]);
    const originalValue = colorScale.invert(color).toFixed(2);
    const darkerValue = Math.max(0, originalValue - 10);
    return colorScale(darkerValue);
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

    contents.forEach((content, fileIndex) => {
      const regex = /Query (\d+) \*\*[\s\S]+?Time: (\d+\.\d+) ms/g;
      let match = regex.exec(contents);

      while (match !== null) {
        const queryNumber = match[1];
        const timeInSeconds = parseFloat(match[2]) / 1000;

        queryTimes.push({
          queryNumber,
          timeInSeconds,
          fileIndex,
        });

        match = regex.exec(content);
      }
    });
    setDuration(queryTimes);
  }, [contents]);

  /* 모든 query에 대한 bar chart */
  useEffect(() => {
    drawGroupedBarChart({
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
      data: duration,
    });
  }, [selectedQuery]);

  function drawGroupedBarChart(props) {
    const { chartSvg, data, over, click, out } = props;
    const svg = d3.select(chartSvg.current);

    svg.selectAll("*").remove();

    // create scales for x and y
    const xGroupScale = d3
      .scaleBand()
      .domain(new Set(data.map((d) => d.queryNumber)))
      .rangeRound([marginX, width - marginX])
      .paddingInner(0.1);

    const fileIndexes = new Set(data.map((d) => d.fileIndex));

    const xScale = d3
      .scaleBand()
      .domain(fileIndexes)
      .rangeRound([0, xGroupScale.bandwidth()])
      .padding(0.05);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.timeInSeconds)])
      .nice()
      .rangeRound([height - marginY, marginY]);

    // create color scale for each bars in the group
    const colorScale = d3
      .scaleOrdinal()
      .domain(fileIndexes)
      .range(d3.schemeCategory10);

    // create x and y axes
    const xAxis = d3.axisBottom(xGroupScale);
    const yAxis = d3.axisLeft(yScale);

    // draw x and y axes
    svg.append("g").attr("transform", `translate(0, ${height})`).call(xAxis);

    svg
      .append("g")
      .attr("transform", `translate(${marginX}, ${marginY})`)
      .call(yAxis);

    // draw bars
    svg
      .append("g")
      .selectAll()
      .data(d3.group(data, (d) => d.queryNumber))
      .join("g")
      .attr(
        "transform",
        ([queryNumber]) => `translate(${xGroupScale(queryNumber)}, 0)`
      )
      .selectAll()
      .data(([, d]) => d)
      .join("rect")
      .attr("x", (d) => xScale(d.fileIndex))
      .attr("y", (d) => yScale(d.timeInSeconds))
      .attr("width", xScale.bandwidth())
      .attr("height", (d) => height - yScale(d.timeInSeconds))
      .attr("fill", (d) => colorScale(d.fileIndex));

    svg.on("mouseover", over).on("mouseout", out).on("click", click);
  }

  function drawBarChart(props) {
    const { chartSvg, data } = props;
    const svg = d3.select(chartSvg.current);

    svg.selectAll("*").remove(); // clear

    const selectedData = data.filter(
      (entry) => entry.queryNumber === (selectedQuery + 1).toString()
    );

    // create scales for x and y
    const xScale = d3
      .scaleBand()
      .domain(selectedData.map((entry) => entry.fileIndex))
      .range([0, selectedWidth])
      .align(0.5)
      .padding(0.1);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(selectedData, (entry) => entry.timeInSeconds)])
      .range([selectedHeight, 0]);

    // create color scale for each bars in the group
    const colorScale = d3
      .scaleOrdinal()
      .domain(selectedData.map((entry) => entry.fileIndex))
      .range(d3.schemeCategory10);

    // create x and y axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    // draw x and y axes
    svg
      .append("g")
      .attr(
        "transform",
        `translate(${selectedMarginX}, ${selectedHeight + marginY})`
      )
      .call(xAxis);

    svg
      .append("g")
      .attr("transform", `translate(${selectedMarginX}, ${marginY})`)
      .call(yAxis);

    // draw bars
    svg
      .append("g")
      .selectAll()
      .data(selectedData)
      .join("rect")
      .attr("x", (d) => xScale(d.fileIndex) + selectedMarginX)
      .attr("y", (d) => yScale(d.timeInSeconds) + marginY)
      .attr("width", xScale.bandwidth())
      .attr("height", (d) => selectedHeight - yScale(d.timeInSeconds))
      .attr("fill", (d) => colorScale(d.fileIndex));
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
          {selectedQuery >= 0 && selectedQuery <= 20 && (
            <div className="chart-container">
              <h1 className="title">Query {selectedQuery + 1} Duration</h1>
              <svg
                ref={selectedSvg}
                width={selectedWidth + 2 * selectedMarginX}
                height={selectedHeight + 2 * marginY}
              />
            </div>
          )}
        </>
      )}
    </>
  );
};

export default CompareView;
