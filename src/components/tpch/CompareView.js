import { useRef, useEffect, useState, useContext } from "react";
import * as d3 from "d3";
import { TpchContext } from "../../contexts/TpchContext";

const CompareView = ({ files }) => {
  const { selectedQuery, setSelectedQuery } = useContext(TpchContext);

  const barplotSvg = useRef(null);
  const selectedSvg = useRef(null);

  const width = document.body.clientWidth * 0.3;
  const height = 200;
  const marginX = document.body.clientWidth * 0.05;
  const marginY = 20;
  const barPadding = 0.3;

  const [contents, setContents] = useState([]);
  const [duration, setDuration] = useState([]);
  const [datasets, setDatasets] = useState([]);

  function onMouseOver() {
    // Save the original color
    const originalColor = d3.select(this).attr("fill");

    // Transition to the darker color
    d3.select(this).transition().duration(200).style("fill", darkenColor(originalColor)); 
  }
  function onMouseClick(e) {
    const selected = e.target.__data__;

    if (selected) setSelectedQuery(selected.queryNumber - 1);
  }
  function onMouseOut() {
    d3.select(this).transition().duration(200).style("fill", (d) => d3.select(this).attr("fill"));
  }

  function darkenColor(color) {
    const colorScale = d3.scaleLinear().domain([0, 1]).range(["#4ab180", "#2a9453"]);
    const originalValue = colorScale.invert(color).toFixed(2);
    const darkerValue = Math.max(0, originalValue - 10); // Adjust the darkness level as needed
    return colorScale(darkerValue);
}

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

  /* input preprocessing */
  useEffect(() => {
    const queryTimes = [];

    contents.forEach((content) => {
      const regex = /Query (\d+) \*\*[\s\S]+?Time: (\d+\.\d+) ms/g;
      let match = regex.exec(contents);

      while (match !== null) {
        const queryNumber = match[1];
        const timeInSeconds = parseFloat(match[2]) / 1000;
  
        queryTimes.push({ queryNumber, timeInSeconds });
  
        match = regex.exec(content);
      }
    });
    setDuration(queryTimes);

    const groupedDatasets = d3.group(queryTimes, (d) => d.queryNumber);
    setDatasets(groupedDatasets);
    
    console.log(datasets)
  }, [contents]);

  /* 모든 query에 대한 bar chart */
  useEffect(() => {
    if (duration)
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
    if (duration && duration[selectedQuery])
      drawBarChart({
        chartSvg: selectedSvg,
        data: [duration[selectedQuery]],
        over: null,
        click: null,
        out: null,
      });
  });

  function drawGroupedBarChart(props) {
    const { chartSvg, data, over, click, out} = props;
    const svg = d3.select(chartSvg.current);

    svg.selectAll("*").remove();

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10)

    // create scales for x and y
    const xScale = d3
        .scaleBand()
        .domain(Array.from(data.keys()))
        .range([0, width])
        .align(0.5)
        .paddingOuter(0.2) // Adjust the padding between groups
        .paddingInner(0.1); // Adjust the padding within each group
  
    const yScale = d3
        .scaleLinear()
        .domain([0, d3.max([...data.values()], (entries) => d3.max(entries, (entry) => entry.timeInSeconds))])
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
    svg.append('g')
      .selectAll('g')
      .data(data)
      .enter()
      .append('g')
      .attr('transform', d => `translate(${xScale(d[0])}, 0)`)
      .selectAll('rect')
      .data(([, values]) => values)
      .enter()
      .append('rect')
      .attr('x', (d, i) => i * xScale.bandwidth() + marginX)
      .attr('y', d => yScale(d.timeInSeconds) + marginY)
      .attr('width', 10)
      .attr('height', d => height - yScale(d.timeInSeconds))
      .attr('fill', (d, i) => colorScale(i))
      .on("mouseover", over)
      .on("mouseout", out)
      .on("click", click);
  }

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

    // draw bars with transition
    svg
      .append("g")
      .selectAll()
      .data(data)
      .join("g")
      .attr("x", (d) => xScale(d.queryNumber) + marginX)
      .attr("y", (d) => height + marginY) // x axis에서 시작해서
      .attr("width", xScale.bandwidth())
      .attr("height", 0)
      .attr("fill", "#4ab180")
      .transition()
      .duration(1000)
      .attr("y", (d) => yScale(d.timeInSeconds) + marginY) // value까지
      .attr("height", (d) => height - yScale(d.timeInSeconds));

    svg.on("mouseover", over).on("mouseout", out).on("click", click);
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