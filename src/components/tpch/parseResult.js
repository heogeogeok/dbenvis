export function parsePostgreSQL(content, fileIndex) {
  const queryTimes = [];

  const regex = /Query (\d+) \*\*[\s\S]+?Time: (\d+\.\d+) ms/g;
  let match = null;

  while ((match = regex.exec(content)) !== null) {
    const queryNumber = match[1];
    const duration = parseFloat(match[2]) / 1000;

    queryTimes.push({
      queryNumber,
      duration,
      fileIndex,
    });
  }

  return queryTimes;
}

export function parseMariaDB(content, fileIndex) {
  const queryTimes = [];
  const regex =
    /Query (\d+) \*\*[\s\S]+?Query_ID\s*Duration\s*Query\s*\n(\d+)\s*(\d+\.\d+)/g;
  let match = null;

  while ((match = regex.exec(content)) !== null) {
    const queryNumber = match[1];
    const duration = parseFloat(match[3]);

    // Query 15 결과값이 올바르지 않아서 제외
    if (queryNumber < 15) {
      queryTimes.push({
        queryNumber,
        duration,
        fileIndex,
      });
    } else if (queryNumber > 15) {
      queryTimes.push({
        queryNumber: (queryNumber - 1).toString(),
        duration,
        fileIndex,
      });
    }
  }

  return queryTimes;
}

/* input preprocessing + query plan update */
export function extractPostgreSQL(content, fileIndex) {
  const regex = /\[(.*?)\](?=\s*\()/gs;
  let match = null;
  const plans = [];

  let i = 1;
  while ((match = regex.exec(content)) !== null) {
    // extract plan and remove every "+"
    let plan = match[1].replace(/\+/g, "");

    // d3의 계층구조 따르기 위해 "Plans"를 "children"으로 대체
    plan = plan.replace(/"Plans":/g, '"children":');
    plan = JSON.parse(plan);

    plans.push({
      queryNumber: i,
      plan,
      fileIndex,
    });

    i++;
  }

  return plans;
}

const opTypes = [
  ["grouping_operation", "Group"],
  ["ordering_operation", "Order"],
  ["duplicates_removal", "Distinct"],
];

const joinTypes = [
  ["Block Nested Loop", "Block Nested Loop"],
  ["Batched Key Access", "Batched Key Access"],
  ["hash join", "Hash Join"],
];

const scanTypes = [
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

export function extractMySQL(content, fileIndex) {
  const regex = /EXPLAIN([\s\S]*?)Query_ID/g;
  let match = null;
  const plans = [];
  let i = 1;

  while ((match = regex.exec(content)) !== null) {
    // parse plan and remove every "\n" and "\"
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
        /"grouping_operation":|"ordering_operation":|"duplicates_removal":|"table":|"query_block":/g,
        '"children":'
      )
    );
    jsonPlan = childrenToArray(jsonPlan);

    plans.push({
      queryNumber: i,
      plan: jsonPlan,
      fileIndex,
    });
  }

  return plans;
}

function traverse(data) {
  function process(i, value) {
    if (value !== null && typeof value === "object") {
      // handle Nested Loop
      if (value["nested_loop"]) {
        value["children"] = { "Node Type": "Nested Loop" };
        handleNestedLoop(
          value["nested_loop"],
          value["children"],
          value["nested_loop"].length - 1
        );
      }

      // handle Attached Subqueries
      if (value["attached_subqueries"]) {
        value["children"] = value["attached_subqueries"][0]["query_block"];
        if (value["children"])
          value["children"]["Node Type"] = "Attached Subqueries";
      }

      // handle Materialized from Subquery
      if (value["materialized_from_subquery"]) {
        value["children"] = value["materialized_from_subquery"]["query_block"];
        if (value["children"]) value["children"]["Node Type"] = "Materialize";
      }

      // 3. handle operations
      const opType = opTypes.find((type) => type[0] === i);
      if (opType) value["Node Type"] = opType[1];

      // 4. handle Table
      if (i === "table") {
        const scanType = scanTypes.find(
          (type) => type[0] === value.access_type
        );
        value["Node Type"] = scanType ? scanType[1] : "Unknown";
      }

      traverse(value);
    }
  }

  for (var i in data) {
    process(i, data[i]);
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

  if (og[num]["table"]["using_join_buffer"]) {
    const joinType = joinTypes.find(
      (type) => type[0] === og[num]["table"]["using_join_buffer"]
    );
    data["Node Type"] = joinType ? joinType[1] : "Unknown";
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

// recursive function to traverse the nested structure
export function traversePlan(node, result) {
  const nodeType = node["Node Type"];
  const cost = node["Total Cost"] - node["Startup Cost"];

  result[nodeType] = (result[nodeType] || 0) + cost;

  if (node.children) {
    for (const child of node.children) {
      traversePlan(child, result);
    }
  }
}

export function shadeColor(color, percent) {
  var r = parseInt(color.substring(1, 3), 16);
  var g = parseInt(color.substring(3, 5), 16);
  var b = parseInt(color.substring(5, 7), 16);

  r = parseInt((r * (100 + percent)) / 100);
  g = parseInt((g * (100 + percent)) / 100);
  b = parseInt((b * (100 + percent)) / 100);

  r = r < 255 ? r : 255;
  g = g < 255 ? g : 255;
  b = b < 255 ? b : 255;

  var rr = r.toString(16).length === 1 ? "0" + r.toString(16) : r.toString(16);
  var gg = g.toString(16).length === 1 ? "0" + g.toString(16) : g.toString(16);
  var bb = b.toString(16).length === 1 ? "0" + b.toString(16) : b.toString(16);

  return "#" + rr + gg + bb;
}
