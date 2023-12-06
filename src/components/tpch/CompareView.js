import { useRef, useEffect, useState, useContext } from "react";
import * as d3 from "d3";
import { TpchContext } from "../../contexts/TpchContext";
import "../../assets/stylesheets/Tpch.css";
import { Checkbox } from "@material-tailwind/react";

import {
  parsePostgreSQL,
  parseMariaDB,
  extractPostgreSQL,
  traversePlan,
  shadeColor,
} from "./parseResult";

const CompareView = props => {
  const { selectedQuery, setSelectedQuery, setDurations } =
    useContext(TpchContext)

  const resultFiles = props.resultFiles
  const explainFiles = props.explainFiles

  const barplotSvg = useRef(null)
  const legendSvg = useRef(null)
  const selectedSvg = useRef(null)
  const stackSvg = useRef(null)

  const width = document.body.clientWidth * 0.35
  const height = 0.35 * document.body.clientHeight
  const marginX = document.body.clientWidth * 0.02
  const marginY = 10

  const selectedWidth = width / 2
  const selectedHeight = 0.3 * document.body.clientHeight
  const selectedMarginX = selectedWidth / 2
  const selectedMarginY = 30

  const legendWidth = width / 4
  const legendItemSize = 12
  const legendMargin = 5

  const [results, setResults] = useState([])
  const [queryPlans, setQueryPlans] = useState([])

  const [showLogScale, setShowLogScale] = useState(false);
  const [showStackedBar, setShowStackedBar] = useState(false);

  function onMouseClick(e) {
    const selected = e.target.__data__
    if (selected) setSelectedQuery(selected.queryNumber - 1)
  }

  const handleCheckboxChange = () => {
    setShowLogScale(prev => !prev)
  }

  const handleStackCheckboxChange = () => {
    setShowStackedBar(prev => !prev)
  }

  /* process result files*/
  useEffect(() => {
    const loadFiles = async () => {
      if (resultFiles && resultFiles.length > 0) {
        let resultContents = []

        for (let i = 0; i < resultFiles.length; i++) {
          const file = resultFiles[i]
          const fileContent = await readFile(file)

          // default: try PostgreSQL
          let queries = parsePostgreSQL(fileContent, i)
          // 실패 시 try MariaDB
          if (queries.length === 0) queries = parseMariaDB(fileContent, i)

          resultContents = resultContents.concat(queries)
        }
        setResults(resultContents)
        setDurations(resultContents)
      } else {
        // 업로드 한 파일 없는 경우
        setResults([])
        setDurations([])
      }
    };
    loadFiles();
  }, [resultFiles, setDurations]);

  /* process explain files */
  useEffect(() => {
    const loadFiles = async () => {
      if (explainFiles && explainFiles.length > 0) {
        let planContents = [];

        for (let i = 0; i < explainFiles.length; i++) {
          const file = explainFiles[i];
          const fileContent = await readFile(file);
          // 일단 Postgres만
          let plans = extractPostgreSQL(fileContent, i);

          planContents = planContents.concat(plans);
        }
        setQueryPlans(planContents);
      } else {
        // 업로드 한 파일 없는 경우
        setQueryPlans([]);
      }
    };

    loadFiles();
  }, [explainFiles]);

  const readFile = file => {
    return new Promise(resolve => {
      const fileReader = new FileReader()

      fileReader.onload = () => {
        resolve(fileReader.result)
      }

      // read the file as text
      fileReader.readAsText(file);
    });
  };

  /* 모든 query에 대한 bar chart */
  useEffect(() => {
    drawGroupedBarChart({
      chartSvg: barplotSvg,
      data: results,
      click: onMouseClick,
    })
  }, [results, showLogScale])

  /* 선택한 query에 대한 bar chart */
  useEffect(() => {
    if (showStackedBar) {
      // if showStackedBar is true
      drawStackedBarChart({
        chartSvg: selectedSvg,
        chartSvg: selectedSvg,
        data: queryPlans,
      });
    } else {
      // otherwise
      drawSelectedBarChart({
        chartSvg: selectedSvg,
        data: results,
      });
    }
  }, [results, queryPlans, selectedQuery, showStackedBar]);

  function drawStackedBarChart(props) {
    const { chartSvg, data } = props
    const svg = d3.select(chartSvg.current)

    svg.selectAll('*').remove()

    // cost + node type array
    const costResults = [];
    const selectedData = data[selectedQuery];

    // TODO: 이 형식으로 처리되도록!
    // const selectedData = data.filter(
    //   (entry) => entry.queryNumber === selectedQuery + 1
    // );

    const cost = [];
    if (selectedData && selectedData.plan && selectedData.plan.Plan) {
      traversePlan(selectedData.plan.Plan, selectedData.fileIndex, cost);
      costResults.push({ fileIndex: selectedData.fileIndex, costs: cost });
    }

    // extract keys from the stacked data
    const keys = Array.from(
      new Set(
        costResults.flatMap((result) =>
          result.costs.map((entry) => entry["Node Type"])
        )
      )
    );

    // generate the stacked data
    const stackedData = costResults.map((d) =>
      d.costs.map((entry) => ({
        fileIndex: d.fileIndex,
        cost: entry["Cost"],
        nodeType: entry["Node Type"],
      }))
    );

    // create a stack generator
    const stack = d3
      .stack()
      .keys(keys)
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone)
      .value((d, key) => d.find((entry) => entry.nodeType === key)?.cost || 0);

    // stack the data
    const layers = stack(stackedData);

    console.log(layers);
    // set up scales
    const xScale = d3
      .scaleBand()
      .domain(layers[0].map((d) => d.data.fileIndex))
      .range([0, selectedWidth])
      .align(0.5)
      .padding(0.1);

    // Calculate the maximum sum of values across all layers
    const maxYValue = d3.max(layers, (layer) => d3.max(layer, (d) => d[1]));

    // Set up the y-axis scale
    const yScale = d3
      .scaleLinear()
      .domain([0, maxYValue])
      .range([selectedHeight, 0]);

    // create x and y axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    // draw x and y axes
    svg
      .append("g")
      .attr("class", "x-axis")
      .attr(
        "transform",
        `translate(${selectedMarginX}, ${selectedHeight + selectedMarginY})`
      )
      .transition()
      .duration(1000)
      .call(xAxis);

    svg
      .append("g")
      .attr("class", "y-axis")
      .attr("transform", `translate(${selectedMarginX}, ${selectedMarginY})`)
      .transition()
      .duration(1000)
      .call(yAxis);

    // set up color scale
    const colorScale = d3
      .scaleOrdinal()
      .domain(keys)
      .range(d3.schemeCategory10);

    // create tooltip element
    // const tooltip = d3
    //   .select("body")
    //   .append("div")
    //   .attr("class", "bar-tooltip");

    // draw the stacked bars
    svg
      .selectAll("rect")
      .data(layers)
      .enter()
      .append("rect")
      .attr("x", (d) => xScale(d[0].fileIndex) + selectedMarginX)
      .attr("y", selectedHeight + selectedMarginY)
      .attr("width", xScale.bandwidth())
      .attr("height", 0)
      .attr("fill", (d) => colorScale(d.key))
      .transition()
      .duration(1000)
      .attr("y", (d) => yScale(d[0][1]) + selectedMarginY)
      .attr("height", (d) => yScale(d[0][0]) - yScale(d[0][1]));

    // .on("mouseover", function (event, d) {
    //   tooltip.html(`${d}`).style("visibility", "visible");
    //   d3.select(this).attr("fill", (d) => shadeColor(colorScale(d), -15));
    // })
    // .on("mousemove", function (e) {
    //   tooltip
    //     .style("top", e.pageY - 10 + "px")
    //     .style("left", e.pageX + 10 + "px");
    // })
    // .on("mouseout", function () {
    //   tooltip.html(``).style("visibility", "hidden");
    //   d3.select(this).attr("fill", (d) => colorScale(d));
    // })
  }

  function drawGroupedBarChart(props) {
    const { chartSvg, data, click } = props
    const fileIndexes = new Set(data.map(d => d.fileIndex))

    const svg = d3.select(chartSvg.current)
    svg.selectAll('*').remove()

    // create scales for x and y
    const xGroupScale = d3
      .scaleBand()
      .domain(new Set(data.map(d => d.queryNumber)))
      .rangeRound([marginX, width - marginX])
      .paddingInner(0.1)

    const xScale = d3
      .scaleBand()
      .domain(fileIndexes)
      .rangeRound([0, xGroupScale.bandwidth()])
      .padding(0.1)

    let yScale
    if (showLogScale) {
      yScale = d3
        .scaleLog()
        .domain([0.01, d3.max(data, d => d.duration)])
        .nice()
        .rangeRound([height - marginY, marginY])
    } else {
      yScale = d3
        .scaleLinear()
        .domain([0, d3.max(data, d => d.duration)])
        .nice()
        .rangeRound([height - marginY, marginY])
    }

    // create color scale for each bars in the group
    const colorScale = d3
      .scaleOrdinal()
      .domain(fileIndexes)
      .range(d3.schemeCategory10)

    // create x and y axes
    const xAxis = d3.axisBottom(xGroupScale)
    const yAxis = d3.axisLeft(yScale)

    // draw x and y axes
    svg
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${height})`)
      .transition()
      .duration(1000)
      .call(xAxis)

    svg
      .append('g')
      .attr('class', 'y-axis')
      .attr('transform', `translate(${marginX}, ${marginY})`)
      .transition()
      .duration(1000)
      .call(yAxis)

    // create tooltip element
    const tooltip = d3.select('body').append('div').attr('class', 'bar-tooltip')

    // draw bars with tooltip
    svg
      .append('g')
      .selectAll()
      .data(d3.group(data, d => d.queryNumber))
      .join('g')
      .attr(
        'transform',
        ([queryNumber]) => `translate(${xGroupScale(queryNumber)}, 0)`
      )
      .selectAll()
      .data(([, d]) => d)
      .join('rect')
      .attr('x', d => xScale(d.fileIndex))
      .attr('y', height)
      .attr('width', xScale.bandwidth())
      .attr('height', 0)
      .attr('fill', d => colorScale(d.fileIndex))
      .on('click', click)
      .on('mouseover', function (event, d) {
        tooltip
          .html(
            `File Name: ${resultFiles[d.fileIndex].name}<br> Query Number: ${
              d.queryNumber
            }<br> Duration: ${d.duration.toFixed(3)} sec`
          )
          .style('visibility', 'visible')
        d3.select(this).attr('fill', d =>
          shadeColor(colorScale(d.fileIndex), -15)
        )
      })
      .on('mousemove', function (e) {
        tooltip
          .style('top', e.pageY - 10 + 'px')
          .style('left', e.pageX + 10 + 'px')
      })
      .on('mouseout', function () {
        tooltip.html(``).style('visibility', 'hidden')
        d3.select(this).attr('fill', d => colorScale(d.fileIndex))
      })
      .transition()
      .duration(1000)
      .attr('y', d => yScale(d.duration) + marginY)
      .attr('height', d => height - yScale(d.duration) - marginY)

    // draw legend
    const legend = d3.select(legendSvg.current)
    legend.selectAll('*').remove()

    // create legend items
    legend
      .append('g')
      .selectAll()
      .data(resultFiles)
      .join('rect')
      .attr('width', legendItemSize)
      .attr('height', legendItemSize)
      .attr('rx', 5)
      .attr(
        'transform',
        (d, i) => `translate(0, ${(legendItemSize + legendMargin) * i})`
      )
      .style('fill', (d, idx) => colorScale(idx))

    // append legend labels
    legend
      .selectAll('text')
      .data(resultFiles)
      .enter()
      .append('text')
      .attr('class', 'legend-label')
      .attr('x', legendItemSize + legendMargin)
      .attr(
        'y',
        (d, idx) => (legendItemSize + legendMargin) * idx + legendItemSize / 2
      )
      .attr('dy', '0.35em')
      .text(d => {
        // 파일 이름이 긴 경우 truncate
        const label = d.name.length > 20 ? `${d.name.slice(0, 20)}...` : d.name
        return label
      })
  }

  function drawSelectedBarChart(props) {
    const { chartSvg, data } = props
    const svg = d3.select(chartSvg.current)

    svg.selectAll('*').remove() // clear

    const selectedData = data.filter(
      entry => entry.queryNumber === (selectedQuery + 1).toString()
    )

    // create scales for x and y
    const xScale = d3
      .scaleBand()
      .domain(selectedData.map(entry => entry.fileIndex))
      .range([0, selectedWidth])
      .align(0.5)
      .padding(0.1)

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(selectedData, entry => entry.duration)])
      .range([selectedHeight, 0])

    // create color scale for each bars in the group
    const colorScale = d3
      .scaleOrdinal()
      .domain(selectedData.map(entry => entry.fileIndex))
      .range(d3.schemeCategory10)

    // create x and y axes
    const xAxis = d3.axisBottom(xScale).tickFormat(index => {
      // 파일 이름이 긴 경우 truncate
      const tick =
        resultFiles[index].name.length > 45 / resultFiles.length
          ? `${resultFiles[index].name.slice(0, 45 / resultFiles.length)}...`
          : resultFiles[index].name
      return tick
    })
    const yAxis = d3.axisLeft(yScale)

    // draw x and y axes
    svg
      .append('g')
      .attr('class', 'x-axis')
      .attr(
        'transform',
        `translate(${selectedMarginX}, ${selectedHeight + selectedMarginY})`
      )
      .transition()
      .duration(1000)
      .call(xAxis)

    svg
      .append('g')
      .attr('class', 'y-axis')
      .attr('transform', `translate(${selectedMarginX}, ${selectedMarginY})`)
      .transition()
      .duration(1000)
      .call(yAxis)

    // draw bars
    svg
      .append('g')
      .selectAll()
      .data(selectedData)
      .join('rect')
      .attr('x', d => xScale(d.fileIndex) + selectedMarginX)
      .attr('y', selectedHeight + selectedMarginY) // transition: 초기 y position 맨 아래에
      .attr('width', xScale.bandwidth())
      .attr('height', 0) // transition: 초기 height 0
      .attr('fill', d => colorScale(d.fileIndex))
      .transition()
      .duration(1000)
      .attr('y', d => yScale(d.duration) + selectedMarginY) // transition: final y position
      .attr('height', d => selectedHeight - yScale(d.duration)) // transition: final height
  }

  return (
    <>
      <h1 className="title">Duration</h1>
      {results.length > 0 && (
        <>
          <div className="legend-container">
            <svg
              ref={legendSvg}
              width={legendWidth}
              height={(legendItemSize + legendMargin) * resultFiles.length}
            />
          </div>
          <div className="chart-container">
            <svg
              ref={barplotSvg}
              width={width + 2 * marginX}
              height={height + 2 * marginY}
            ></svg>
          </div>
          <div className="checkbox-container">
            <Checkbox
              color="blue"
              className="h-4 w-4 rounded-full border-gray-900/20 bg-gray-900/10 transition-all hover:scale-105 hover:before:opacity-0"
              checked={showLogScale}
              label={<p className="text">Show Log Scale</p>}
              onClick={handleCheckboxChange}
            />
          </div>
          {selectedQuery >= 0 && selectedQuery <= 20 && (
            <div className="chart-container">
              <h1 className="title">Query {selectedQuery + 1} Duration</h1>
              <svg
                className="mb-4"
                ref={selectedSvg}
                width={selectedWidth + 2 * selectedMarginX}
                height={selectedHeight + 2 * selectedMarginY}
              />
              <div className="checkbox-container">
                <Checkbox
                  color="blue"
                  className="h-4 w-4 rounded-full border-gray-900/20 bg-gray-900/10 transition-all hover:scale-105 hover:before:opacity-0"
                  checked={showStackedBar}
                  label={<p className="text">Stacked Bar Chart</p>}
                  onClick={handleStackCheckboxChange}
                />
              </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}

export default CompareView
