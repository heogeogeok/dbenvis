import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";


const Cmpview = (props) => {
    const barplotSvg = useRef(null);
    const splotSvg = useRef(null);
    const svgSize = props.margin *  2 + props.size;

    useEffect(() => {
        const margin = props.margin;
        const height = props.size;
        const width = props.size;
        const barPadding = props.barPadding;
        const data = props.data;

        if (!data || data.length === 0) {
            return; 
        }

        /* Bar plot */ 
        // Create an SVG containr for the bar plot 
        d3.select(barplotSvg.current).selectAll("*").remove();

        // Extract query numbers and times from the data array
        const queryNumbers = data.map((entry) => entry.queryNumber);
        const queryTimes = data.map((entry) => entry.timeInSeconds);

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
        const xBarAxis = d3.axisBottom().scale(xBarScale);
        const yBarAxis = d3.axisLeft.scale(yBarScale);
        const barplotContainer = d3.select(barplotSvg.current);

        barplotContainer.append("g")
            .attr("transform", `traslate(${margin}, ${height + margin})`)
            .call(xBarAxis);
        
        barplotContainer.append("g")
            .attr("transform", `translate(${margin}, ${margin})`)
            .call(yBarAxis);
        
        // Create bars
        barplotContainer.selectAll("rect")
            .data(data)
            .enter()
            .append("rect")
            .attr("x", (d) => xBarScale(d.queryNumber))
            .attr("y", (d) => yBarScale(d.timeInSeconds))
            .attr("width", xBarScale.bandwidth())
            .attr("height", (d) => height - yBarScale(d.timeInSeconds))
            .attr("fill", "steelblue");

        // Append x and y axis
        barplotContainer.append("g")
            .attr("transform", `translate(${margin}, ${height + margin})`)
            .call(xBarAxis);

        barplotContainer.append("g")
            .attr("transform", `translate(${margin}, ${margin})`)
            .call(yBarAxis);

    }, [props]);
    
    return (
        <div>
            <svg ref={barplotSvg} width={svgSize} height={svgSize}>
            </svg>
        </div>
    )
}
export default Cmpview;