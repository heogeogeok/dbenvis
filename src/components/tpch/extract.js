/*
 * extract.js: EXPLAIN 결과 전처리
 * 데이터베이스마다 함수 추가하는 방식으로 구현 가능
 */

import { json } from "d3";

/*
 * PostgreSQL
 */
export function extractPostgreSQL(content) {
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
}

/*
 * MySQL
 */
const opTypes = [
  ["grouping_operation", "Group"],
  ["ordering_operation", "Order"],
  ["duplicates_removal", "Distinct"],
  ["materialized_from_subquery", "Materialize"],
  ["attached_subqueries", "Attached Subqueries"], // 안먹혀
];

const joinTypes = [
  ["system", "Single Row\n(system constant)"],
  ["const", "Single Row\n(constant)"],
  ["eq_ref", "Unique Key Lookup"],
  ["ref", "Non-Unique Key Lookup"],
  ["fulltext", "Fulltext Index Search"],
  ["ref_or_null", "Key Lookup +\nFetch NULL Values"],
  ["index_merge", "Index Merge"],
  ["unique_subquery", "Unique Key Lookup\ninto table of subquery"],
  ["index_subquery", "Non-Unique Key Lookup\ninto table of subquery"],
  ["range", "Index Range Scan"],
  ["index", "Full Index Scan"],
  ["ALL", "Full Table Scan"],
];

export function extractMySQL(content) {
  const regex = /EXPLAIN([\s\S]*?)Query_ID/g;
  let match = null;
  const plans = [];

  while ((match = regex.exec(content)) !== null) {
    // extract plan and remove every "\n" and "\"
    let plan = match[1].replace(/\\n/g, "");
    plan = plan.replace(/\\/g, "");

    // JSON object 생성
    let jsonPlan = JSON.parse(plan);
    jsonPlan.query_block["Node Type"] = "Limit";

    // JSON object 순회하면서 preprocessing
    traverse(jsonPlan);

    // d3의 계층구조 따르기 위해 operations를 "children"으로 대체하고 형식 Array로 변경
    jsonPlan = JSON.parse(
      JSON.stringify(jsonPlan).replace('"query_block":', '"Plan":')
    );
    jsonPlan = JSON.parse(
      JSON.stringify(jsonPlan).replace(
        /"grouping_operation":|"ordering_operation":|"duplicates_removal":|"table":|"materialized_from_subquery":|"attached_subqueries":|"query_block":/g,
        '"children":'
      )
    );
    jsonPlan = childrenToArray(jsonPlan);

    plans.push(jsonPlan);
  }

  return plans;
}

function traverse(data) {
  for (var i in data) {
    if (data[i] !== null && typeof data[i] === "object") {
      // 1. handle Nested Loop
      if (data[i]["nested_loop"]) {
        data[i]["children"] = { "Node Type": "Nested Loop" };
        handleNestedLoop(
          data[i]["nested_loop"],
          data[i]["children"],
          data[i]["nested_loop"].length - 1
        );
      }

      // 2. handle operations
      const opType = opTypes.find((type) => type[0] === i);
      if (opType) data[i]["Node Type"] = opType[1];

      // 3. handle Table
      if (i === "table") {
        const joinType = joinTypes.find(
          (type) => type[0] === data[i].access_type
        );
        data[i]["Node Type"] = joinType ? joinType[1] : "Unknown";
      }

      traverse(data[i]);
    }
  }
}

function handleNestedLoop(og, data, num) {
  const nested_loop_node = { "Node Type": "Nested Loop" };

  if (num > 1) {
    data["children"] = [nested_loop_node, og[num]["table"]];
    data["children"]["Node Type"] = "Nested Loop";

    handleNestedLoop(og, data["children"][0], num - 1);
  } else {
    data["children"] = [og[0]["table"], og[1]["table"]];
    data["children"]["Node Type"] = "Nested Loop";
  }
}

function childrenToArray(obj) {
  if (obj && obj.children && !Array.isArray(obj.children)) {
    obj.children = [obj.children];
  }

  if (obj && typeof obj === "object") {
    for (const key in obj) {
      if (
        Array.isArray(obj[key]) ||
        (obj[key] && typeof obj[key] === "object")
      ) {
        obj[key] = childrenToArray(obj[key]);
      }
    }
  }

  return obj;
}
