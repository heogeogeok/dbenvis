import { useCallback, useEffect, useRef } from 'react'
import * as d3 from 'd3'

const nodeColor = d3
  .scaleOrdinal()
  .domain([
    'Limit',
    'Aggregate',
    'Gather',
    'Gather Merge',
    'Group',
    'Sort',
    'Order',
    'Seq Scan',
    'Index Scan',
    'Index Only Scan',
    'Full Index Scan',
    'Full Table Scan',
    'Unique Key Lookup',
    'Non-Unique Key Lookup',
    'Bitmap Heap Scan',
    'Bitmap Index Scan',
    'Nested Loop',
    'Join',
    'Hash Join',
    'Merge Join',
    'Attached Subqueries',
    'Hash',
    'Materialize',
  ])
  .range([
    '#fbb4ae',
    '#b3cde3',
    '#b3cde3',
    '#b3cde3',
    '#b3cde3',
    '#ccebc5',
    '#ccebc5',
    '#decbe4',
    '#decbe4',
    '#decbe4',
    '#decbe4',
    '#decbe4',
    '#decbe4',
    '#decbe4',
    '#decbe4',
    '#decbe4',
    '#fed9a6',
    '#fed9a6',
    '#fed9a6',
    '#fed9a6',
    '#ffffcc',
    '#e5d8bd',
    '#fddaec',
    '#f2f2f2',
  ])

const mysqlMapping = {
  Limit: 'Limit',
  Aggregate: 'Group',
  Gather: 'Gather',
  'Gather Merge': 'Gather Merge',
  Sort: 'Order',
  'Seq Scan': 'Full Table Scan',
  'Index Scan': 'Key Lookup',
  'Index Only Scan': 'Key Lookup',
  'Bitmap Heap Scan': 'Bitmap Heap Scan',
  'Bitmap Index Scan': 'Bitmap Index Scan',
  'Nested Loop': 'Nested Loop',
  'Hash Join': 'Hash Join',
  'Merge Join': 'Hash Join',
  'Attached Subqueries': 'Attached Subqueries',
  Hash: 'Hash',
  Materialize: 'Materialize',
}

const postgresMapping = {
  Limit: 'Limit',
  Group: 'Aggregate',
  Order: 'Sort',
  'Full Table Scan': 'Seq Scan',
  'Unique Key Lookup': 'Index Scan',
  'Non-Unique Key Lookup': 'Index Scan',
  'Nested Loop': 'Nested Loop',
  'Hash Join': 'Hash Join',
  'Attached Subqueries': 'Attached Subqueries',
  Hash: 'Hash',
  Materialize: 'Materialize',
}

const QueryPlanView = props => {
  const treeSvg = useRef(null)

  const width = props.width
  const height = 0.7 * document.body.clientHeight
  const marginY = 30

  const drawTree = useCallback(
    (data, checkbox, optionValue) => {
      const treeLayout = d3.tree().size([width, height])

      // data를 d3의 계층 구조로 바꾸어주기
      const root = d3.hierarchy(data)
      const treeData = treeLayout(root)

      // query cost 계산
      const cost = treeData.links().map(link => {
        if (link.target.data['Total Cost']) {
          // PostgreSQL
          return (
            link.target.data['Total Cost'] - link.target.data['Startup Cost']
          )
        } else if (link.target.data.cost_info) {
          // MySQL
          const cost = Object.entries(link.target.data.cost_info || {})
            .filter(([key]) => key.includes('cost'))
            .map(([_, value]) => parseFloat(value) || 0)

          return d3.sum(cost)
        }

        return 0
      })

      // # of rows 계산
      const rows = treeData.links().map(link => {
        if (link.target.data['Plan Rows']) {
          // PostgreSQL
          return link.target.data['Plan Rows']
        } else if (link.target.data.cost_info) {
          // MySQL
          const rows = Object.entries(link.target.data || {})
            .filter(([key]) => key.includes('rows'))
            .map(([_, value]) => value || 0)

          return d3.sum(rows)
        }

        return 0
      })

      // scale for stroke width
      const strokeWidthScale = d3
        .scaleLinear()
        .domain([d3.min(cost), d3.max(cost)])
        .range([1, 8])

      // Existing logic for node width
      const getNodeWidth = (type, length) => {
        return (type?.length || length || 0) * 9
      }

      // Calculate nodeSize and maxNodeSize based on the maximum width of nodes
      const calculateNodeSize = () => {
        const types = ['MySQL', 'PostgreSQL', 'Both'] // Add other types if needed
        const lengths = types.map(type => {
          return getNodeWidth(type, 1) // Set a default length for each type
        })

        const maxNodeWidth = Math.max(...lengths)
        const nodeSize = maxNodeWidth / 9 // Assuming 9 is the constant multiplier

        const maxNodeSize = Math.min(maxNodeWidth, maxNodeWidth * 9)

        return { nodeSize, maxNodeSize }
      }

      const { nodeSize, maxNodeSize } = calculateNodeSize()

      const costScale = d3
        .scaleLinear()
        .domain([d3.min(cost), d3.max(cost)])
        .range([nodeSize, maxNodeSize])

      const rowScale = d3
        .scaleLinear()
        .domain([d3.min(rows), d3.max(rows)])
        .range([nodeSize, maxNodeSize])

      const svg = d3
        .select(treeSvg.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height + 2 * marginY)
        .append('g') // 그룹으로 묶어서
        .attr('transform', `translate(0, ${marginY})`) // margin 적용
        .call(
          d3.zoom().on('zoom', event => {
            svg.attr('transform', event.transform)
          })
        )
        .append('g')

      // create edges with arrow markers
      svg
        .selectAll('line')
        .data(treeData.links())
        .enter()
        .append('line')
        .attr('x1', d => d.target.x)
        .attr('y1', d => d.target.y)
        .attr('x2', d => d.source.x)
        .attr('y2', d => d.source.y)
        .attr('stroke', 'red')
        .attr('stroke-width', (d, i) => strokeWidthScale(cost[i]))

      // create nodes
      const nodes = svg
        .selectAll('g')
        .data(treeData.descendants())
        .enter()
        .append('g')
        .attr('transform', d => `translate(${d.x}, ${d.y})`)

      nodes
        .append('rect')
        .attr('fill', d => nodeColor(d.data['Node Type']))
        .attr('width', (d, i) => {
          if (optionValue === 'cost') {
            return costScale(cost[i])
          } else if (optionValue === 'row') {
            return rowScale(rows[i])
          } else {
            let nodeType = d.data['Node Type']
            let mysqlLength = mysqlMapping[nodeType]?.length || 0
            let postgresLength =
              (postgresMapping && postgresMapping[nodeType]?.length) || 0

            if (checkbox === 'MySQL') {
              return (mysqlLength || nodeType?.length || 0) * 9
            } else if (checkbox === 'PostgreSQL') {
              return (postgresLength || nodeType?.length || 0) * 9
            } else if (checkbox === 'Both') {
              return (nodeType?.length || 0) * 9
            } else {
              return 0
            }
          }
        })
        .attr('height', d =>
          d.data['Relation Name'] || d.data.table_name ? 40 : 25
        )
        .attr('rx', 5)
        .attr('transform', d => {
          let nodeType = d.data['Node Type']
          let mysqlLength = mysqlMapping[nodeType]?.length || 0
          let postgresLength =
            (postgresMapping && postgresMapping[nodeType]?.length) || 0

          if (checkbox === 'MySQL') {
            return `translate(${
              (-mysqlLength * 9) / 2 || (-nodeType?.length * 9) / 2 || 0
            }, -10)`
          } else if (checkbox === 'PostgreSQL') {
            return `translate(${
              (-postgresLength * 9) / 2 || (-nodeType?.length * 9) / 2 || 0
            }, -10)`
          } else if (checkbox === 'Both') {
            return `translate(${(-nodeType?.length * 9) / 2 || 0}, -10)`
          } else {
            return ''
          }
        })

      // append "Node Type" as node label
      nodes
        .append('text')
        .attr('dy', 7)
        .attr('text-anchor', 'middle')
        .text(d => {
          if (checkbox === 'MySQL')
            return mysqlMapping[d.data['Node Type']] || d.data['Node Type']
          else if (checkbox === 'Both') return d.data['Node Type']
          else if (checkbox === 'PostgreSQL')
            return postgresMapping[d.data['Node Type']] || d.data['Node Type']
        })

      // append "Relation Name" or "table_name"
      nodes
        .append('text')
        .attr('class', 'relation-name')
        .attr('dy', 22)
        .attr('text-anchor', 'middle')
        .text(d =>
          d.data['Relation Name']
            ? d.data['Relation Name'].toUpperCase()
            : d.data.table_name
            ? d.data.table_name.toUpperCase()
            : null
        )

      // create tooltip
      var tooltip = d3
        .select('body')
        .append('div')
        .attr('id', 'tooltip')
        .attr('class', 'node-tooltip')

      nodes
        .on('mouseover', function (event, d) {
          tooltip.html(tooltipContent(d)).style('visibility', 'visible')
        })
        .on('mousemove', function (e) {
          tooltip
            .style('top', e.pageY - 30 + 'px')
            .style('left', e.pageX + 10 + 'px')
        })
        .on('mouseout', function () {
          tooltip.style('visibility', 'hidden')
        })
    },
    [width, height, marginY]
  )

  useEffect(() => {
    d3.select(treeSvg.current).selectAll('*').remove() // clear
    d3.select('body').selectAll('#tooltip').remove()
    drawTree(props.plan, props.checkbox, props.selectedOption)
  }, [props, drawTree])

  function tooltipContent(d) {
    let content = `Node Type: ${d.data['Node Type']}`

    if (d.data['Total Cost']) {
      // PostgreSQL
      if (d.data['Relation Name']) {
        content += `<br>Relation Name: ${d.data['Relation Name'].toUpperCase()}`
      }

      content += `<br>Cost: ${(
        d.data['Total Cost'] - d.data['Startup Cost']
      ).toFixed(2)}<br>Plan Rows: ${d.data['Plan Rows']}<br>Plan Width: ${
        d.data['Plan Width']
      }`
    } else if (d.data['cost_info']) {
      // MySQL
      if (d.data['table_name']) {
        content += `<br>Relation Name: ${d.data['table_name'].toUpperCase()}`
      }

      const totalCost = Object.entries(d.data.cost_info || {})
        .filter(([key]) => key.includes('cost'))
        .map(([_, value]) => parseFloat(value) || 0)

      content += `<br>Cost: ${d3.sum(totalCost).toFixed(2)}`
    }

    return content
  }

  return (
    <div>
      <svg
        className="node-label"
        ref={treeSvg}
        width={width}
        height={height + 2 * marginY}
      ></svg>
    </div>
  )
}

export default QueryPlanView
