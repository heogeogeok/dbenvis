/*
 * parse.js: EXPLAIN 결과 전처리
 * 데이터베이스마다 함수 추가하는 방식으로 구현 가능
 */

/*
 * 1. PostgreSQL
 */
export function parseExpPostgreSQL(content) {
  const regex = /\[(.*?)\](?=\s*\()/gs
  let match = null
  const plans = []

  while ((match = regex.exec(content)) !== null) {
    // parse plan and remove every "+"
    let plan = match[1].replace(/\+/g, '')

    // d3의 계층구조 따르기 위해 "Plans"를 "children"으로 대체
    plan = plan.replace(/"Plans":/g, '"children":')

    plans.push(JSON.parse(plan))
  }

  return plans
}

/*
 * 2. MySQL
 */
const opTypes = [
  ['grouping_operation', 'Group'],
  ['ordering_operation', 'Order'],
  ['duplicates_removal', 'Distinct'],
]

const joinTypes = [
  ['Block Nested Loop', 'Block Nested Loop'],
  ['Batched Key Access', 'Batched Key Access'],
  ['hash join', 'Hash Join'],
]

const scanTypes = [
  ['system', 'Single Row\n(system constant)'],
  ['const', 'Single Row\n(constant)'],
  ['eq_ref', 'Unique Key Lookup'],
  ['ref', 'Non-Unique Key Lookup'],
  ['fulltext', 'Fulltext Index Search'],
  ['ref_or_null', 'Key Lookup +\nFetch NULL Values'],
  ['index_merge', 'Index Merge'],
  ['unique_subquery', 'Unique Key Lookup\ninto table of subquery'],
  ['index_subquery', 'Non-Unique Key Lookup\ninto table of subquery'],
  ['range', 'Index Range Scan'],
  ['index', 'Full Index Scan'],
  ['ALL', 'Full Table Scan'],
]

export function parseExpMySQL(content) {
  const regex = /EXPLAIN([\s\S]*?)Query_ID/g
  let match = null
  const plans = []

  while ((match = regex.exec(content)) !== null) {
    // parse plan and remove every "\n" and "\"
    let plan = match[1].replace(/\\n/g, '')
    plan = plan.replace(/\\/g, '')

    // JSON object 생성
    let jsonPlan = JSON.parse(plan)
    jsonPlan.query_block['Node Type'] = 'Limit'

    // JSON object 순회하면서 preprocessing
    traverse(jsonPlan)

    // d3의 계층구조 따르기 위해 operations를 "children"으로 대체하고 형식 Array로 변경
    jsonPlan = JSON.parse(
      JSON.stringify(jsonPlan).replace('"query_block":', '"Plan":')
    )
    jsonPlan = JSON.parse(
      JSON.stringify(jsonPlan).replace(
        /"grouping_operation":|"ordering_operation":|"duplicates_removal":|"table":|"query_block":/g,
        '"children":'
      )
    )
    jsonPlan = childrenToArray(jsonPlan)

    plans.push(jsonPlan)
  }

  return plans
}

function traverse(data) {
  function process(i, value) {
    if (value !== null && typeof value === 'object') {
      // handle Nested Loop
      if (value['nested_loop']) {
        value['children'] = { 'Node Type': 'Nested Loop' }
        handleNestedLoop(
          value['nested_loop'],
          value['children'],
          value['nested_loop'].length - 1
        )
      }

      // handle Attached Subqueries
      if (value['attached_subqueries']) {
        value['children'] = value['attached_subqueries'][0]['query_block']
        if (value['children'])
          value['children']['Node Type'] = 'Attached Subqueries'
      }

      // handle Materialized from Subquery
      if (value['materialized_from_subquery']) {
        value['children'] = value['materialized_from_subquery']['query_block']
        if (value['children']) value['children']['Node Type'] = 'Materialize'
      }

      // 3. handle operations
      const opType = opTypes.find(type => type[0] === i)
      if (opType) value['Node Type'] = opType[1]

      // 4. handle Table
      if (i === 'table') {
        const scanType = scanTypes.find(type => type[0] === value.access_type)
        value['Node Type'] = scanType ? scanType[1] : 'Unknown'
      }

      traverse(value)
    }
  }

  for (var i in data) {
    process(i, data[i])
  }
}

function handleNestedLoop(og, data, num) {
  const nested_loop_node = { 'Node Type': 'Nested Loop' }

  if (num > 1) {
    data['children'] = [nested_loop_node, og[num]['table']]
    data['children']['Node Type'] = 'Nested Loop'

    handleNestedLoop(og, data['children'][0], num - 1)
  } else {
    data['children'] = [og[0]['table'], og[1]['table']]
    data['children']['Node Type'] = 'Nested Loop'
  }

  if (og[num]['table']['using_join_buffer']) {
    const joinType = joinTypes.find(
      type => type[0] === og[num]['table']['using_join_buffer']
    )
    data['Node Type'] = joinType ? joinType[1] : 'Unknown'
  }
}

function childrenToArray(obj) {
  if (obj && obj.children && !Array.isArray(obj.children)) {
    obj.children = [obj.children]
  }

  if (obj && typeof obj === 'object') {
    for (const key in obj) {
      if (
        Array.isArray(obj[key]) ||
        (obj[key] && typeof obj[key] === 'object')
      ) {
        obj[key] = childrenToArray(obj[key])
      }
    }
  }

  return obj
}
