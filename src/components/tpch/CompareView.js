import React, { useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'

const CompareView = ({ files, ...props }) => {
  const barplotSvg = useRef(null)
  const selectedQuerySvg = useRef(null)
  const width = props.width
  const selectedWidth = 350
  const selectedHeight = 350
  const barHeight = 350

  const [contents, setContents] = useState([])
  const [queryTimes, setQueryTimes] = useState([])
  const [selectedQuery, setSelectedQuery] = useState({})

  /* 데이터 파싱 */
  const parseQueryTimes = fileContents => {
    const regex = /Query (\d+) \*\*[\s\S]+?Time: (\d+\.\d+) ms/g
    const queryTimes = []
    let match

    while ((match = regex.exec(fileContents)) !== null) {
      const queryNumber = match[1]
      const timeInSeconds = parseFloat(match[2]) / 1000
      queryTimes.push({ queryNumber, timeInSeconds })
    }

    return queryTimes
  }


  useEffect(() => {
    if (files && files.length > 0) {
      const fileContents = []

      /* Create a FileReader for each file */
      files.forEach(file => {
        const fileReader = new FileReader()

        fileReader.onload = () => {
          fileContents.push(fileReader.result)
          setContents(fileContents)
        }

        /* Read the file as text */
        fileReader.readAsText(file)
      })
    }
  }, [files])

  useEffect(() => {
    const extractedQueryTimes = parseQueryTimes(contents)
    setQueryTimes(extractedQueryTimes)
  }, [contents])

  useEffect(() => {
    const barPadding = props.barPadding
    const margin = props.margin
    const height = props.height
    const width = props.width

    // Create an SVG container for the bar plot
    d3.select(barplotSvg.current).selectAll('*').remove()

    // Extract query numbers and times from the data array
    const queryNumbers = queryTimes.map(entry => entry.queryNumber)
    const queryDuration = queryTimes.map(entry => entry.timeInSeconds)

    // Create scales for x and y
    const xBarScale = d3
      .scaleBand()
      .domain(queryNumbers)
      .range([0, width])
      .align(0.5)
      .padding(barPadding)

    const yBarScale = d3
      .scaleLinear()
      .domain([0, d3.max(queryDuration)])
      .range([height, 0])

    // Create x and y axes
    const xBarAxis = d3.axisBottom(xBarScale)
    const yBarAxis = d3.axisLeft(yBarScale)
    const barplotContainer = d3.select(barplotSvg.current)

    // Draw x axis
    barplotContainer
      .append('g')
      .attr('transform', `translate(${margin}, ${height + margin})`)
      .call(xBarAxis)

    // Draw y axis
    barplotContainer
      .append('g')
      .attr('transform', `translate(${margin}, ${margin})`)
      .call(yBarAxis)

    function onMouseOver(d, i) {
      d3.select(this).transition().duration(400).style('fill', 'red')
    }

    function onMouseOut(d, i) {
      d3.select(this).transition().duration(400).style('fill', 'steelblue')
    }

    const drawBarchart = (selectedQuery) => {
      const selectedNumber = selectedQuery.queryNumber
      const selectedDuration = selectedQuery.timeInSeconds

      const barPadding = props.barPadding
      const margin = props.margin
      const height = props.height
      const width = props.width
  
      // Create an SVG container for the bar plot
      d3.select(selectedQuerySvg.current).selectAll('*').remove()
  
      // Create scales for x and y
      const xScale = d3
        .scaleBand()
        .domain([selectedNumber])
        .range([0, width])
        .align(0.5)
        .padding(barPadding)
  
      const yScale = d3
        .scaleLinear()
        .domain([0, selectedDuration])
        .range([height, 0])
  
      // Create x and y axes
      const xAxis = d3.axisBottom(xScale)
      const yAxis = d3.axisLeft(yScale)
      const selectedContainer = d3.select(selectedQuerySvg.current)
  
      // Draw x axis
      selectedContainer
        .append('g')
        .attr('transform', `translate(${margin}, ${height + margin})`)
        .call(xAxis)
  
      // Draw y axis
      selectedContainer
        .append('g')
        .attr('transform', `translate(${margin}, ${margin})`)
        .call(yAxis)
      
      selectedContainer
        .append('g')
        .selectAll('rect')
        .data([selectedQuery])
        .join('rect')
        .attr('x', d => xScale(d.queryNumber) + margin)
        .attr('y', d => yScale(d.timeInSeconds) + margin)
        .attr('width', xScale.bandwidth())
        .attr('height', d => height - yScale(d.timeInSeconds))
        .attr('fill', 'steelblue')
    }

    const onMouseClick = (d, i) => {
      setSelectedQuery(i)
      drawBarchart(selectedQuery)
    }

    // Create bars
    barplotContainer
      .append('g')
      .selectAll('rect')
      .data(queryTimes)
      .join('rect')
      .attr('x', d => xBarScale(d.queryNumber) + margin)
      .attr('y', d => yBarScale(d.timeInSeconds) + margin)
      .attr('width', xBarScale.bandwidth())
      .attr('height', d => height - yBarScale(d.timeInSeconds))
      .attr('fill', 'steelblue')
      .on('mouseover', onMouseOver)
      .on('mouseout', onMouseOut)
      .on('click', onMouseClick)
  }, [props, queryTimes, selectedQuery])

  return (
    <div>
      <div className='container'>
        <div>Selected Query</div>
        <svg ref={selectedQuerySvg} width={selectedWidth} height={selectedHeight} />
        </div>
      <div className='container'>
        <div>Duration</div>
        <svg ref={barplotSvg} width={width} height={barHeight}></svg>
      </div>
    </div>
  )
}

export default CompareView
