import { useRef, useEffect, useState, useContext } from "react";
import * as d3 from "d3";
import { TpchContext } from "../../contexts/TpchContext";
import "../../assets/stylesheets/Tpch.css";
import Button from "@mui/material/Button";
import { Checkbox } from "@material-tailwind/react";

import { parsePostgreSQL, parseMariaDB } from "./parseResult";

const CompareView = (props) => {
  const { selectedQuery, setSelectedQuery } = useContext(TpchContext);

  const resultFiles = props.resultFiles;
  const explainFiles = props.explainFiles;

  const barplotSvg = useRef(null);
  const selectedSvg = useRef(null);
  const stackSvg = useRef(null);

  const width = document.body.clientWidth * 0.35;
  const height = 0.35 * document.body.clientHeight;
  const marginX = document.body.clientWidth * 0.02;
  const marginY = 15;

  const selectedWidth = width / 2;
  const selectedHeight = 0.3 * document.body.clientHeight;
  const selectedMarginX = selectedWidth / 2;
  const selectedMarginY = 30;

  const [results, setResults] = useState([]);
  const [queryPlans, setQueryPlans] = useState([]);

  const [showLogScale, setShowLogScale] = useState(false);

  function onMouseClick(e) {
    const selected = e.target.__data__;
    if (selected) setSelectedQuery(selected.queryNumber - 1);
  }

  const handleCheckboxChange = () => {
    setShowLogScale((prev) => !prev);
  };

  // darked/lighten a color
  function shadeColor(color, percent) {
    var r = parseInt(color.substring(1, 3), 16);
    var g = parseInt(color.substring(3, 5), 16);
    var b = parseInt(color.substring(5, 7), 16);

    r = parseInt((r * (100 + percent)) / 100);
    g = parseInt((g * (100 + percent)) / 100);
    b = parseInt((b * (100 + percent)) / 100);

    r = r < 255 ? r : 255;
    g = g < 255 ? g : 255;
    b = b < 255 ? b : 255;

    var rr =
      r.toString(16).length === 1 ? "0" + r.toString(16) : r.toString(16);
    var gg =
      g.toString(16).length === 1 ? "0" + g.toString(16) : g.toString(16);
    var bb =
      b.toString(16).length === 1 ? "0" + b.toString(16) : b.toString(16);

    return "#" + rr + gg + bb;
  }

  // recursive function to traverse the nested structure
  function traversePlan(node, result) {
    result.push({
      "Node Type": node["Node Type"],
      Cost: node["Total Cost"] - node["Startup Cost"],
    });
    // check if 'children' property exists
    if ("children" in node) {
      // iterate over each child
      for (const child of node.children) {
        // recursively call traversePlan for each child
        traversePlan(child, result);
      }
    }
  }

  /* process result files*/
  useEffect(() => {
    const loadFiles = async () => {
      if (resultFiles && resultFiles.length > 0) {
        let resultContents = [];

        for (let i = 0; i < resultFiles.length; i++) {
          const file = resultFiles[i];
          const fileContent = await readFile(file);

          // default: try PostgreSQL
          let queries = parsePostgreSQL(fileContent, i);
          // 실패 시 try MariaDB
          if (queries.length === 0) queries = parseMariaDB(fileContent, i);

          resultContents = resultContents.concat(queries);
        }
        setResults(resultContents);
      } else {
        // 업로드 한 파일 없는 경우
        setResults([]);
      }
    };
    loadFiles();
  }, [resultFiles]);

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

  /* process explain files */
  // useEffect(() => {
  //   const loadFiles = async () => {
  //     if (explainFiles && explainFiles.length > 0) {
  //       const planContents = [];

  //       for (const file of explainFiles) {
  //         const fileContent = await readFile(file);

  //         // default: try PostgreSQL
  //         let plans = extractPostgreSQL(fileContent);

  //         planContents.push(plans);
  //       }

  //       setQueryPlans(planContents);
  //     } else {
  //       // 업로드 한 파일 없는 경우
  //       setQueryPlans([]);
  //     }
  //   };

  //   loadFiles();
  // }, [explainFiles]);

  /* input preprocessing + query plan update */
  const extractPostgreSQL = (content) => {
    const regex = /\[(.*?)\](?=\s*\()/gs;
    let match = null;
    const plans = [];

    while ((match = regex.exec(content)) !== null) {
      // extract plan and remove every "+"
      let plan = match[1].replace(/\+/g, "");

      // d3의 계층구조 따르기 위해 "Plans"를 "children"으로 대체
      plan = plan.replace(/"Plans":/g, '"children":');

      plans.push(JSON.parse(plan));
    }

    return plans;
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
    drawSelectedBarChart({
      chartSvg: selectedSvg,
      data: results,
    });
  }, [results, selectedQuery]);

  /* 선택한 query에 대한 stacked bar chart */
  useEffect(() => {
    if (queryPlans.length > 0) {
      drawStackedBarChart({
        chartSvg: stackSvg,
        data: queryPlans,
      });
    }
  });

  function drawStackedBarChart(props) {
    const { chartSvg, data } = props;
    const svg = d3.select(chartSvg.current);

    svg.selectAll("*").remove();

    // cost + node type array
    const costResults = [];

    let i = 0;
    while (i < data.length) {
      const cost = [];
      traversePlan(data[i][selectedQuery]["Plan"], cost);
      costResults.push(cost);
      i++;
    }

    const stackedData = costResults.map((result) => {
      const obj = {};
      result.forEach((entry) => {
        obj[entry["Node Type"]] = entry["Cost"];
      });
      return obj;
    });

    // extract keys from the stacked data
    const keys = Object.keys(stackedData[0]);

    // stack the data
    const stack = d3.stack().keys(keys)(stackedData);

    // map keys to the stacked data
    stack.map((d, i) => {
      d.map((d) => {
        d.key = keys[i];
        return d;
      });
      return d;
    });
  }

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
    const legend = svg
      .selectAll(".legend")
      .data(fileIndexes.values())
      .enter()
      .append("g")
      .attr("class", "legend")
      .attr("transform", function (d, i) {
        return "translate(0," + i * 20 + ")";
      });

    legend
      .append("rect")
      .attr("x", width + 18)
      .attr("width", 18)
      .attr("height", 18)
      .style("fill", (d) => colorScale(d));

    legend
      .append("text")
      .attr("x", width + 40)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "start")
      .text(function (d) {
        return resultFiles[d].name; // Use resultFiles to get the name for each fileIndex
      });
  }

  function drawSelectedBarChart(props) {
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
      .domain([0, d3.max(selectedData, (entry) => entry.duration)])
      .range([selectedHeight, 0]);

    // create color scale for each bars in the group
    const colorScale = d3
      .scaleOrdinal()
      .domain(selectedData.map((entry) => entry.fileIndex))
      .range(d3.schemeCategory10);

    // create x and y axes
    const xAxis = d3
      .axisBottom(xScale)
      .tickFormat((index) => resultFiles[index].name);
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

  return (
    <>
      <h1 className="title">Duration</h1>
      {results.length > 0 && (
        <>
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
              <Button variant="contained">Stacked Bar Chart</Button>
              {queryPlans.length > 0 && (
                <svg
                  ref={stackSvg}
                  width={selectedWidth + 2 * selectedMarginX}
                  height={selectedHeight + 2 * selectedMarginY}
                />
              )}
            </div>
          )}
        </>
      )}
    </>
  );
};

export default CompareView;
