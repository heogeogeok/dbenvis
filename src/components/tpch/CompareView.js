import React, {useRef, useEffect} from "react";
import * as d3 from "d3";

const CompareView = (props) => {
    
    const barplotSvg = useRef(null);
    const svgSize = props.margin * 2 + props.size;

    useEffect(() => {
        const barPadding = props.barPadding;
        const data = props.data;
        const margin = props.margin;
        const height = props.height;
        const width = props.width;

        // Create an SVG container for the bar plot
        d3.select(barplotSvg.current).selectAll("*").remove();

        // Add a text label for the title "Duration"
        d3.select(barplotSvg.current)
            .attr("width", svgSize)
            .attr("height", svgSize)
            .append("text")
            .attr("x", margin) 
            .attr("y", margin + 20)
            .attr("text-anchor", "start")
            .attr("font-weight", "bold");
        

        // Extract query numbers and times from the data array
        const queryNumbers = data.map((entry) => entry.queryNumber);
        const queryTimes = data.map((entry) => entry.timeInSeconds);

        console.log(queryNumbers);
        console.log(queryTimes);

        // Create scales for x and y
        const xBarScale = d3.scaleBand()
            .domain(queryNumbers)
            .range([0, width])
            .align(0.5)
            .padding(barPadding);

        const yBarScale = d3.scaleLinear()
            .domain([0, d3.max(queryTimes)])
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
            .data(data)
            .join("rect")
            .attr("x", (d) => xBarScale(d.queryNumber) + margin)
            .attr("y", (d) => yBarScale(d.timeInSeconds) + margin)
            .attr("width", xBarScale.bandwidth())
            .attr("height", (d) => height - yBarScale(d.timeInSeconds))
            .attr("fill", "steelblue");
    }, [props]);

    return (
        
        <div className="mt-64">
            Duration
            <svg ref={barplotSvg} width={svgSize} height={svgSize}></svg>
        </div>

    )
    
}

export default CompareView;
