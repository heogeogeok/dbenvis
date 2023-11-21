import * as d3 from 'd3'
import { useRef, useEffect } from 'react'

const BarChart = props => {
  const barplotSvg = useRef(null)

  const width = document.body.clientWidth * 0.3
  const height = 200
  const marginX = document.body.clientWidth * 0.05
  const marginY = 20
  const barPadding = 0.3

  useEffect(() => {
    drawBarChart({ chartSvg: barplotSvg })
  }, [])

  function drawBarChart(props) {
    const { chartSvg } = props
    const svg = d3.select(chartSvg.current)

    svg.selectAll('*').remove() // clear

    // create scales for x and y
    const xScale = d3
      .scaleBand()
      .domain(['PostgreSQL', 'MariaDB'])
      .range([0, width])
      .align(0.5)
      .padding(barPadding)

    const yScale = d3.scaleLinear().domain([0, 1000]).range([height, 0])

    // create x and y axes
    const xAxis = d3.axisBottom(xScale)
    const yAxis = d3.axisLeft(yScale)

    // draw x and y axes
    svg
      .append('g')
      .attr('transform', `translate(${marginX}, ${height + marginY})`)
      .call(xAxis)

    svg
      .append('g')
      .attr('transform', `translate(${marginX}, ${marginY})`)
      .call(yAxis)

    // draw bars
    svg
      .append('g')
      .selectAll('rect')
      .data([
        { name: 'PostgreSQL', value: 200 },
        { name: 'MariaDB', value: 980 },
      ])
      .enter()
      .append('rect')
      .attr('x', d => xScale(d.name) + marginX)
      .attr('y', d => yScale(d.value) + marginY)
      .attr('width', xScale.bandwidth())
      .attr('height', d => yScale(0) - yScale(d.value))
      .attr('fill', d => (d.name === 'PostgreSQL' ? 'lightgreen' : 'plum'))
  }
  return (
    <>
      <h1 className="title">Average TPS</h1>
      <svg
        ref={barplotSvg}
        width={width + 2 * marginX}
        height={height + 2 * marginY}
      ></svg>
    </>
  )
}

export default BarChart
