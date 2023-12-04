import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

const QueryPlanView = props => {
  const treeSvg = useRef(null)

  const width = props.width
  const height = 0.8 * document.body.clientHeight
  const marginY = 50

  function drawTree(data) {
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

    const treeLayout = d3.tree().size([width, height])

    // data를 d3의 계층 구조로 바꾸어주기
    const root = d3.hierarchy(data)
    const treeData = treeLayout(root)

    // create edges
    svg
      .selectAll('line')
      .data(treeData.links())
      .enter()
      .append('line')
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)
      .attr('stroke', 'black')

    // create nodes
    const nodes = svg
      .selectAll('g')
      .data(treeData.descendants())
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.x}, ${d.y})`)

    nodes.append('circle').attr('r', 5).attr('fill', 'red')

    // append "Node Type" as node label
    nodes
      .append('text')
      .attr('dy', -10)
      .attr('text-anchor', 'middle')
      .text(d => d.data['Node Type'])
  }

  useEffect(() => {
    d3.select(treeSvg.current).selectAll('*').remove() // clear
    drawTree(props.plan)
  }, [props])

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
