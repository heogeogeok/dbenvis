import { useRef, useEffect, useState, useContext } from 'react'
import * as d3 from 'd3'
import { TpchContext } from '../../contexts/TpchContext'
import '../../assets/stylesheets/Tpch.css'
import Button from '@mui/material/Button'

const CompareView = props => {
  const { selectedQuery, setSelectedQuery } = useContext(TpchContext)

  const resultFiles = props.resultFiles
  const explainFiles = props.explainFiles

  const barplotSvg = useRef(null)
  const selectedSvg = useRef(null)
  const stackSvg = useRef(null)

  const width = document.body.clientWidth * 0.3
  const height = 0.4 * document.body.clientHeight
  const marginX = document.body.clientWidth * 0.01
  const marginY = 20

  const selectedWidth = document.body.clientWidth * 0.15
  const selectedHeight = 0.3 * document.body.clientHeight
  const selectedMarginX = selectedWidth / 2

  const [results, setResults] = useState([])
  const [queryPlans, setQueryPlans] = useState([])

  function onMouseClick(e) {
    const selected = e.target.__data__
    if (selected) setSelectedQuery(selected.queryNumber - 1)
  }

  // darked/lighten a color
  function shadeColor(color, percent) {
    var r = parseInt(color.substring(1, 3), 16)
    var g = parseInt(color.substring(3, 5), 16)
    var b = parseInt(color.substring(5, 7), 16)

    r = parseInt((r * (100 + percent)) / 100)
    g = parseInt((g * (100 + percent)) / 100)
    b = parseInt((b * (100 + percent)) / 100)

    r = r < 255 ? r : 255
    g = g < 255 ? g : 255
    b = b < 255 ? b : 255

    var rr = r.toString(16).length === 1 ? '0' + r.toString(16) : r.toString(16)
    var gg = g.toString(16).length === 1 ? '0' + g.toString(16) : g.toString(16)
    var bb = b.toString(16).length === 1 ? '0' + b.toString(16) : b.toString(16)

    return '#' + rr + gg + bb
  }

  // recursive function to traverse the nested structure
  function traversePlan(node, result) {
    result.push({
      'Node Type': node['Node Type'],
      Cost: node['Total Cost'] - node['Startup Cost'],
    })
    // check if 'children' property exists
    if ('children' in node) {
      // iterate over each child
      for (const child of node.children) {
        // recursively call traversePlan for each child
        traversePlan(child, result)
      }
    }
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
      } else {
        // 업로드 한 파일 없는 경우
        setResults([])
      }
    }
    loadFiles()
  }, [resultFiles])

  const readFile = file => {
    return new Promise(resolve => {
      const fileReader = new FileReader()

      fileReader.onload = () => {
        resolve(fileReader.result)
      }

      // read the file as text
      fileReader.readAsText(file)
    })
  }

  const parsePostgreSQL = (content, fileIndex) => {
    const queryTimes = []

    const regex = /Query (\d+) \*\*[\s\S]+?Time: (\d+\.\d+) ms/g
    let match = null

    while ((match = regex.exec(content)) !== null) {
      const queryNumber = match[1]
      const duration = parseFloat(match[2]) / 1000

      queryTimes.push({
        queryNumber,
        duration,
        fileIndex,
      })
    }

    return queryTimes
  }

  const parseMariaDB = (content, fileIndex) => {
    const queryTimes = []
    const regex =
      /Query (\d+) \*\*[\s\S]+?Query_ID\s*Duration\s*Query\s*\n(\d+)\s*(\d+\.\d+)/g
    let match = null

    while ((match = regex.exec(content)) !== null) {
      const queryNumber = match[1]
      const duration = parseFloat(match[3]) / 1000

      queryTimes.push({
        queryNumber,
        duration,
        fileIndex,
      })
    }

    return queryTimes
  }

  /* process explain files */
  useEffect(() => {
    const loadFiles = async () => {
      if (explainFiles && explainFiles.length > 0) {
        const planContents = []

        for (const file of explainFiles) {
          const fileContent = await readFile(file)

          // default: try PostgreSQL
          let plans = extractPostgreSQL(fileContent)

          planContents.push(plans)
        }

        setQueryPlans(planContents)
      } else {
        // 업로드 한 파일 없는 경우
        setQueryPlans([])
      }
    }

    loadFiles()
  }, [explainFiles])

  /* input preprocessing + query plan update */
  const extractPostgreSQL = content => {
    const regex = /\[(.*?)\](?=\s*\()/gs
    let match = null
    const plans = []

    while ((match = regex.exec(content)) !== null) {
      // extract plan and remove every "+"
      let plan = match[1].replace(/\+/g, '')

      // d3의 계층구조 따르기 위해 "Plans"를 "children"으로 대체
      plan = plan.replace(/"Plans":/g, '"children":')

      plans.push(JSON.parse(plan))
    }

    return plans
  }

  /* 모든 query에 대한 bar chart */
  useEffect(() => {
    drawGroupedBarChart({
      chartSvg: barplotSvg,
      data: results,
      click: onMouseClick,
    })
  }, [results])

  /* 선택한 query에 대한 bar chart */
  useEffect(() => {
    drawBarChart({
      chartSvg: selectedSvg,
      data: results,
    })
  }, [results])

  /* 선택한 query에 대한 stacked bar chart */
  useEffect(() => {
    if (queryPlans.length > 0) {
      drawStackedBarChart({
        chartSvg: stackSvg,
      })
    }
  })

  function drawStackedBarChart(props) {
    const { chartSvg } = props
    const svg = d3.select(chartSvg.current)
  }

  function drawGroupedBarChart(props) {
    const { chartSvg, data, click } = props
    const svg = d3.select(chartSvg.current)

    svg.selectAll('*').remove()

    // create scales for x and y
    const xGroupScale = d3
      .scaleBand()
      .domain(new Set(data.map(d => d.queryNumber)))
      .rangeRound([marginX, width - marginX])
      .paddingInner(0.1)

    const fileIndexes = new Set(data.map(d => d.fileIndex))

    const xScale = d3
      .scaleBand()
      .domain(fileIndexes)
      .rangeRound([0, xGroupScale.bandwidth()])
      .padding(0.05)

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, d => d.duration)])
      .nice()
      .rangeRound([height - marginY, marginY])

    // create color scale for each bars in the group
    const colorScale = d3
      .scaleOrdinal()
      .domain(fileIndexes)
      .range(d3.schemeCategory10)

    // create x and y axes
    const xAxis = d3.axisBottom(xGroupScale)
    const yAxis = d3.axisLeft(yScale)

    // draw x and y axes
    svg.append('g').attr('transform', `translate(0, ${height})`).call(xAxis)

    svg
      .append('g')
      .attr('transform', `translate(${marginX}, ${marginY})`)
      .call(yAxis)

    // draw bars
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
      .attr('y', d => yScale(d.duration))
      .attr('width', xScale.bandwidth())
      .attr('height', d => height - yScale(d.duration))
      .attr('fill', d => colorScale(d.fileIndex))
      .on('click', click)
      .on('mouseover', function (event, d) {
        tooltip
          .html(
            `File Index: ${d.fileIndex}<br> Query Number: ${d.queryNumber}<br> Duration: ${d.duration} sec`
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

    // create tooltip element
    const tooltip = d3
      .select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('z-index', '10')
      .style('visibility', 'hidden')
      .style('padding', '15px')
      .style('background', 'rgba(0,0,0,0.6)')
      .style('border-radius', '5px')
      .style('color', '#fff')
  }

  function drawBarChart(props) {
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
    const xAxis = d3.axisBottom(xScale)
    const yAxis = d3.axisLeft(yScale)

    // draw x and y axes
    svg
      .append('g')
      .attr(
        'transform',
        `translate(${selectedMarginX}, ${selectedHeight + marginY})`
      )
      .call(xAxis)

    svg
      .append('g')
      .attr('transform', `translate(${selectedMarginX}, ${marginY})`)
      .call(yAxis)

    // draw bars
    svg
      .append('g')
      .selectAll()
      .data(selectedData)
      .join('rect')
      .attr('x', d => xScale(d.fileIndex) + selectedMarginX)
      .attr('y', d => yScale(d.duration) + marginY)
      .attr('width', xScale.bandwidth())
      .attr('height', d => selectedHeight - yScale(d.duration))
      .attr('fill', d => colorScale(d.fileIndex))
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
          {selectedQuery >= 0 && selectedQuery <= 20 && (
            <div className="chart-container">
              <h1 className="title">Query {selectedQuery + 1} Duration</h1>
              <svg
                ref={selectedSvg}
                width={selectedWidth + 2 * selectedMarginX}
                height={selectedHeight + 2 * marginY}
              />
              <Button variant="contained">Stacked Bar Chart</Button>
              <svg
                ref={stackSvg}
                width={selectedWidth + 2 * selectedMarginX}
                height={selectedHeight + 2 * marginY}
              />
            </div>
          )}
        </>
      )}
    </>
  )
}

export default CompareView
