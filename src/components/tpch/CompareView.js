import { useRef, useEffect, useState, useContext } from "react";
import * as d3 from "d3";
import { TpchContext } from "../../contexts/TpchContext";
import "../../assets/stylesheets/Tpch.css";
import { Checkbox, Button } from "@material-tailwind/react";

import { shadeColor, nodeColor, legendOpColor, mapOpLegend } from "./mapping";
import {
  parseExpPostgreSQL,
  parseExpMySQL,
  parseExpMariaDB,
} from "./parseExplain";
import {
  parseDurPostgreSQL,
  parseDurMariaDB,
  retrieveCost,
  retrieveRows,
} from "./parseDuration";

const CompareView = (props) => {
  const { selectedQuery, setSelectedQuery, setDurations, selectedMetric } =
    useContext(TpchContext);

  const resultFiles = props.resultFiles;
  const explainFiles = props.explainFiles;

  const [results, setResults] = useState([]);
  const [queryPlans, setQueryPlans] = useState([]);

  const [showLogScale, setShowLogScale] = useState(false);
  const [showStackedBar, setShowStackedBar] = useState(false);

  const barplotSvg = useRef(null);
  const legendSvg = useRef(null);
  const selectedSvg = useRef(null);
  const stackedLegendSvg = useRef(null);

  const width = document.body.clientWidth * 0.35;
  const height = 270;
  const marginX = 50;
  const marginY = 10;

  const selectedWidth = width / 2;
  const selectedHeight = 270;
  const selectedMarginX = showStackedBar
    ? selectedWidth / 5
    : selectedWidth / 2;
  const selectedMarginY = 30;

  const legendWidth = width / 4;
  const legendItemSize = 12;
  const legendMargin = 5;

  function onMouseClick(e) {
    const selected = e.target.__data__;
    if (selected) setSelectedQuery(selected.queryNumber - 1);
  }

  const handleCheckboxChange = () => {
    setShowLogScale((prev) => !prev);
  };

  const handleStackCheckboxChange = () => {
    setShowStackedBar((prev) => !prev);
  };

  /* process result files*/
  useEffect(() => {
    const loadFiles = async () => {
      if (resultFiles && resultFiles.length > 0) {
        let resultContents = [];

        for (let i = 0; i < resultFiles.length; i++) {
          const file = resultFiles[i];
          const fileContent = await readFile(file);

          // default: try PostgreSQL
          let queries = parseDurPostgreSQL(fileContent, i);

          // 실패 시 try MariaDB
          if (queries.length === 0) queries = parseDurMariaDB(fileContent, i);

          resultContents = resultContents.concat(queries);
        }
        setResults(resultContents);
        setDurations(resultContents);
      } else {
        // 업로드 한 파일 없는 경우
        setResults([]);
        setDurations([]);
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

          // default: try PostgreSQL
          let plans = parseExpPostgreSQL(fileContent, true, i);

          // 실패 시
          if (plans.length === 0) {
            const regex = /cost_info/;
            if (regex.test(fileContent)) {
              // run MySQL
              plans = parseExpMySQL(fileContent, true, i);
            } else {
              // run MariaDB
              plans = parseExpMariaDB(fileContent, true, i);
            }
          }

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

  /* 모든 query에 대한 bar chart */
  useEffect(() => {
    drawGroupedBarChart({
      chartSvg: barplotSvg,
      data: results,
      click: onMouseClick,
    });
  }, [results, showLogScale]);

  /* 선택한 query에 대한 bar chart */
  useEffect(() => {
    if (showStackedBar) {
      drawStackedBarChart({
        chartSvg: selectedSvg,
        data: queryPlans,
      });
    } else {
      drawSelectedBarChart({
        chartSvg: selectedSvg,
        data: results,
      });
    }
  }, [results, queryPlans, selectedQuery, selectedMetric, showStackedBar]);

  function drawGroupedBarChart(props) {
    const { chartSvg, data, click } = props;
    const fileIndexes = new Set(data.map((d) => d.fileIndex));

    const svg = d3.select(chartSvg.current);
    svg.selectAll("*").remove();

    // create scales for x and y
    const xGroupScale = d3
      .scaleBand()
      .domain(new Set(data.map((d) => d.queryNumber)))
      .rangeRound([marginX, width - marginX])
      .paddingInner(0.1);

    const xScale = d3
      .scaleBand()
      .domain(fileIndexes)
      .rangeRound([0, xGroupScale.bandwidth()])
      .padding(0.1);

    let yScale;
    if (showLogScale) {
      yScale = d3
        .scaleLog()
        .domain([0.01, d3.max(data, (d) => d.duration)])
        .nice()
        .rangeRound([height - marginY, marginY]);
    } else {
      yScale = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d) => d.duration)])
        .nice()
        .rangeRound([height - marginY, marginY]);
    }

    // create color scale for each bars in the group
    const colorScale = d3
      .scaleOrdinal()
      .domain(fileIndexes)
      .range(d3.schemeCategory10);

    // create x and y axes
    const xAxis = d3.axisBottom(xGroupScale);
    const yAxis = d3.axisLeft(yScale);

    // draw x and y axes
    svg
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${height})`)
      .transition()
      .duration(1000)
      .call(xAxis);

    svg
      .append("g")
      .attr("class", "y-axis")
      .attr("transform", `translate(${marginX}, ${marginY})`)
      .transition()
      .duration(1000)
      .call(yAxis);

    // create tooltip element
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "bar-tooltip");

    // draw bars with tooltip
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
      .attr("y", height)
      .attr("width", xScale.bandwidth())
      .attr("height", 0)
      .attr("fill", (d) => colorScale(d.fileIndex))
      .on("click", click)
      .on("mouseover", function (event, d) {
        tooltip
          .html(
            `File Name: ${resultFiles[d.fileIndex].name}<br> Query Number: ${
              d.queryNumber
            }<br> Duration: ${d.duration.toFixed(3)} sec`
          )
          .style("visibility", "visible");
        d3.select(this).attr("fill", (d) =>
          shadeColor(colorScale(d.fileIndex), -15)
        );
      })
      .on("mousemove", function (e) {
        tooltip
          .style("top", e.pageY - 10 + "px")
          .style("left", e.pageX + 10 + "px");
      })
      .on("mouseout", function () {
        tooltip.html(``).style("visibility", "hidden");
        d3.select(this).attr("fill", (d) => colorScale(d.fileIndex));
      })
      .transition()
      .duration(1000)
      .attr("y", (d) => yScale(d.duration) + marginY)
      .attr("height", (d) => height - yScale(d.duration) - marginY);

    // draw legend
    const legend = d3.select(legendSvg.current);
    legend.selectAll("*").remove();

    // create legend items
    legend
      .append("g")
      .selectAll()
      .data(resultFiles)
      .join("rect")
      .attr("width", legendItemSize)
      .attr("height", legendItemSize)
      .attr("rx", 5)
      .attr(
        "transform",
        (d, idx) => `translate(0, ${(legendItemSize + legendMargin) * idx})`
      )
      .style("fill", (d, idx) => colorScale(idx));

    // append legend labels
    legend
      .selectAll("text")
      .data(resultFiles)
      .enter()
      .append("text")
      .attr("class", "legend-label")
      .attr("x", legendItemSize + legendMargin)
      .attr(
        "y",
        (d, idx) => (legendItemSize + legendMargin) * idx + legendItemSize / 2
      )
      .attr("dy", "0.35em")
      .text((d) => {
        // 파일 이름이 긴 경우 truncate
        const label = d.name.length > 20 ? `${d.name.slice(0, 20)}...` : d.name;
        return label;
      });
  }

  function drawSelectedBarChart(props) {
    const { chartSvg, data } = props;
    const svg = d3.select(chartSvg.current);

    svg.selectAll("*").remove(); // clear
    d3.select(stackedLegendSvg.current).selectAll("*").remove(); // remove legend

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
      .domain([0, d3.max(selectedData, (entry) => entry.duration)])
      .range([selectedHeight, 0]);

    // create color scale for each bars in the group
    const colorScale = d3
      .scaleOrdinal()
      .domain(selectedData.map((entry) => entry.fileIndex))
      .range(d3.schemeCategory10);

    // create x and y axes
    const xAxis = d3.axisBottom(xScale).tickFormat((index) => {
      // 파일 이름이 긴 경우 truncate
      const tick =
        resultFiles[index].name.length > 45 / resultFiles.length
          ? `${resultFiles[index].name.slice(0, 45 / resultFiles.length)}...`
          : resultFiles[index].name;
      return tick;
    });
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

    // draw bars
    svg
      .append("g")
      .selectAll()
      .data(selectedData)
      .join("rect")
      .attr("x", (d) => xScale(d.fileIndex) + selectedMarginX)
      .attr("y", selectedHeight + selectedMarginY) // transition: 초기 y position 맨 아래에
      .attr("width", xScale.bandwidth())
      .attr("height", 0) // transition: 초기 height 0
      .attr("fill", (d) => colorScale(d.fileIndex))
      .transition()
      .duration(1000)
      .attr("y", (d) => yScale(d.duration) + selectedMarginY) // transition: final y position
      .attr("height", (d) => selectedHeight - yScale(d.duration)); // transition: final height
  }

  function drawStackedBarChart(props) {
    const { chartSvg, data } = props;
    const svg = d3.select(chartSvg.current);

    svg.selectAll("*").remove();

    const selectedData = data.filter(
      (entry) => entry.queryNumber === selectedQuery + 1
    );

    const stackedData = [];

    selectedData.forEach((entry) => {
      const result = { fileIndex: entry.fileIndex };

      if (entry.plan && entry.plan.Plan) {
        if (selectedMetric === "cost") retrieveCost(entry.plan.Plan, result);
        else if (selectedMetric === "rows")
          retrieveRows(entry.plan.Plan, result);
        else retrieveCost(entry.plan.Plan, result);
      }
      stackedData.push(result);
    });

    // store relevant keys
    const keys = stackedData.reduce((allKeys, entry) => {
      const entryKeys = Object.keys(entry).slice(1);

      entryKeys.forEach((key) => {
        if (!allKeys.includes(key)) {
          allKeys.push(key);
        }
      });

      return allKeys;
    }, []);

    // create stack with relevant data
    const stack = d3.stack().keys(keys)(stackedData);

    // calculate the sum of values for each group
    const groupSums = stack[0].map((_, i) =>
      d3.sum(stack.map((layer) => layer[i][1] - layer[i][0]))
    );

    // normalize the data
    stack.forEach((layer) => {
      layer.forEach((d, i) => {
        d[0] = d[0] / groupSums[i];
        d[1] = d[1] / groupSums[i];
      });
    });

    // set up scales
    const xScale = d3
      .scaleBand()
      .domain(stackedData.map((d) => d.fileIndex))
      .range([0, selectedWidth])
      .align(0.5)
      .padding(0.1);

    const yScale = d3.scaleLinear().domain([0, 1]).range([selectedHeight, 0]);

    // create x and y axes
    const xAxis = d3.axisBottom(xScale).tickFormat((index) => {
      // 파일 이름이 긴 경우 truncate
      const tick =
        explainFiles[index].name.length > 45 / explainFiles.length
          ? `${explainFiles[index].name.slice(0, 45 / explainFiles.length)}...`
          : explainFiles[index].name;
      return tick;
    });

    const yAxis = d3.axisLeft(yScale).tickFormat(d3.format(".0%"));

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

    // create tooltip element
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "bar-tooltip");

    let metricPercentage;

    // create stack rect
    const rect = svg
      .selectAll()
      .data(stack)
      .enter()
      .append("g")
      .attr("transform", `translate(${selectedMarginX}, ${selectedMarginY})`)
      .attr("fill", (d) => nodeColor(d.key))
      .on("mouseover mousemove", function (event, d) {
        if (selectedMetric === "rows")
          tooltip
            .html(`Operator: ${d.key}<br> Rows: ${metricPercentage}`)
            .style("visibility", "visible");
        else
          tooltip
            .html(`Operator: ${d.key}<br> Cost: ${metricPercentage}`)
            .style("visibility", "visible");
      });

    // stack rect for each data value
    rect
      .selectAll("rect")
      .data((d) => d)
      .enter()
      .append("rect")
      .attr("x", function (d) {
        return xScale(d.data.fileIndex);
      })
      .attr("y", selectedHeight)
      .attr("height", 0)
      .attr("width", xScale.bandwidth())
      .transition()
      .duration(1000)
      .attr("y", (d) => yScale(d[1]))
      .attr("height", (d) => yScale(d[0]) - yScale(d[1]))
      .attr("stroke", "grey")
      .attr("stroke-width", 0.2);

    rect
      .selectAll("rect")
      .data((d) => d)
      .on("mouseover", function (event, d) {
        metricPercentage = (d[1] - d[0]).toLocaleString("en-US", {
          style: "percent",
          minimumFractionDigits: 2,
        });
      })
      .on("mousemove", function (e) {
        tooltip
          .style("top", e.pageY - 10 + "px")
          .style("left", e.pageX + 10 + "px");
      })
      .on("mouseout", function () {
        tooltip.html(``).style("visibility", "hidden");
      });

    // draw legend
    const legend = d3.select(stackedLegendSvg.current);
    legend.selectAll("*").remove();

    // duplicate keys are not allowed
    const tempKeys = Array.from(new Set(keys.map((key) => mapOpLegend[key])));
    const uniqueKeys = tempKeys.filter((value) => value !== undefined);

    // create legend items
    legend
      .append("g")
      .selectAll()
      .data(uniqueKeys)
      .join("rect")
      .attr("width", legendItemSize)
      .attr("height", legendItemSize)
      .attr("rx", 5)
      .attr(
        "transform",
        (d, idx) => `translate(0, ${(legendItemSize + legendMargin) * idx})`
      )
      .style("fill", (d) => legendOpColor(d));

    // append legend labels
    legend
      .selectAll("text")
      .data(uniqueKeys)
      .enter()
      .append("text")
      .attr("class", "legend-label")
      .attr("x", legendItemSize + legendMargin)
      .attr(
        "y",
        (d, idx) => (legendItemSize + legendMargin) * idx + legendItemSize / 2
      )
      .attr("dy", "0.35em")
      .text((d) => d);
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
              <div className="legend-container">
                <svg
                  ref={selectedSvg}
                  width={selectedWidth + 2 * selectedMarginX}
                  height={selectedHeight + 2 * selectedMarginY}
                />
                <svg ref={stackedLegendSvg} width={legendWidth} />
              </div>
              <div className="button-container">
                <Button
                  size="sm"
                  color="blue"
                  onClick={handleStackCheckboxChange}
                >
                  {showStackedBar ? (
                    <p className="text">Show Duration Bar</p>
                  ) : (
                    <p className="text">Show Metric Percentage</p>
                  )}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default CompareView;
