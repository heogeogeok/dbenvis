import React, {useRef, useEffect, useState} from "react";
import * as d3 from "d3";

const CompareView = ({files, ...props}) => {
    
    const barplotSvg = useRef(null);
    const svgSize = props.margin * 2 + props.size;

    const [contents, setContents] = useState([]);
    const [queryTimes, setQueryTimes] = useState([]);

    const [selectedBar, setSelectedBar] = useState(null);

    /* 데이터 파싱 */
    const parseQueryTimes = (fileContents) => {
      const regex = /Query (\d+) \*\*[\s\S]+?Time: (\d+\.\d+) ms/g;
      const queryTimes = [];
      let match;
  
      while ((match = regex.exec(fileContents)) !== null) {
        const queryNumber = match[1];
        const timeInSeconds = parseFloat(match[2]) / 1000;
        queryTimes.push({ queryNumber, timeInSeconds });
      }
  
      console.log(queryTimes);
  
      return queryTimes;
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
          };
  
          /* Read the file as text */
          fileReader.readAsText(file);
        }
        );
      }
    }, [files]);

    useEffect(() => {
      const extractedQueryTimes = parseQueryTimes(contents);
      setQueryTimes(extractedQueryTimes);
    }, [contents]);

    useEffect(() => {
        const barPadding = props.barPadding;
        const margin = props.margin;
        const height = props.height;
        const width = props.width;


        // Create an SVG container for the bar plot
        d3.select(barplotSvg.current).selectAll("*").remove();


        // Extract query numbers and times from the data array
        const queryNumbers = queryTimes.map((entry) => entry.queryNumber);
        const queryDuration =  queryTimes.map((entry) => entry.timeInSeconds);

        console.log(queryNumbers);
        console.log(queryDuration);

        // Create scales for x and y
        const xBarScale = d3.scaleBand()
            .domain(queryNumbers)
            .range([0, width])
            .align(0.5)
            .padding(barPadding);

        const yBarScale = d3.scaleLinear()
            .domain([0, d3.max(queryDuration)])
            .range([height, 0]);

        // Create x and y axes
        const xBarAxis = d3.axisBottom(xBarScale);
        const yBarAxis = d3.axisLeft(yBarScale);
        const barplotContainer = d3.select(barplotSvg.current);

        // Draw x axis
        barplotContainer.append('g')
            .attr('transform', `translate(${margin}, ${height + margin})`)
            .call(xBarAxis);

        // Draw y axis
        barplotContainer.append('g')
            .attr('transform', `translate(${margin}, ${margin})`)
            .call(yBarAxis);


        // Create bars
        barplotContainer.append('g')
            .selectAll()
            .data(queryTimes)
            .join("rect")
            .attr("x", (d) => xBarScale(d.queryNumber) + margin)
            .attr("y", (d) => yBarScale(d.timeInSeconds) + margin)
            .attr("width", xBarScale.bandwidth())
            .attr("height", (d) => height - yBarScale(d.timeInSeconds))
            .attr("fill", "steelblue")
            .on('click', (d) => {
              setSelectedBar(d);
              barplotContainer.attr('opacity', '0.5');
            });

    }, [props, queryTimes, selectedBar]);

    return (     
        <div className="mt-64">
            Duration
            <svg ref={barplotSvg} width={svgSize} height={svgSize}>
            </svg>
        </div>
    )
}

export default CompareView;
