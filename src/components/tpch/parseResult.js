import * as d3 from "d3";

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

    i++;
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
          value["children"]["Node Type"] = "Attached Subquery";
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

/*
 * 3. MariaDB
 */
export function extractMariaDB(content, fileIndex) {
  const regex = /(?:EXPLAIN|ANALYZE)([\s\S]*?)Query_ID/g;
  let match = null;
  const plans = [];
  let i = 1;

  while ((match = regex.exec(content)) !== null) {
    // parse plan and remove every "\n" and "\"
    let plan = match[1].replace(/\\n/g, "");
    plan = plan.replace(/\\/g, "");

    const subregex = /"table"([\s\S]*?)"table"/g;
    let submatch = null;
    let n = 0;

    // JSON cannot have duplicate keys
    while ((submatch = subregex.exec(plan)) !== null) {
      plan = plan.replace(
        `"table"${submatch[1]}"table"`,
        `"table${n}"${submatch[1]}"table${n + 1}"`
      );

      n = n + 2;
    }
    plan = plan.replace(/"table"/, `"table${n}"`);

    // JSON object 생성
    let jsonPlan = JSON.parse(plan);
    jsonPlan["query_block"]["Node Type"] = "Limit";

    // filesort 없는 경우
    handleTables(jsonPlan["query_block"], jsonPlan["query_block"], false);

    // JSON object 순회하면서 preprocessing
    searchMariaDB(jsonPlan);

    // d3의 계층구조 따르기 위해 operations를 "children"으로 대체하고 형식 Array로 변경
    let jsonString = JSON.stringify(jsonPlan);

    n = 0;
    while (jsonString.includes(`"table${n}"`)) {
      jsonString = jsonString.replace(`"table${n}"`, '"children"');
      n++;
    }

    jsonString = jsonString.replace('"query_block":', '"Plan":');
    jsonString = jsonString.replace(/"filesort":/, '"children":');

    jsonPlan = JSON.parse(jsonString);
    jsonPlan = childrenToArray(jsonPlan);

    plans.push({
      queryNumber: i,
      plan: jsonPlan,
      fileIndex,
    });

    i++;
  }

  return plans;
}

function searchMariaDB(data) {
  function process(i, value) {
    if (value !== null && typeof value === "object") {
      // handle Temporary Table with Subqueries
      if (value["temporary_table"])
        handleTables(value["temporary_table"], value, false);

      // handle Materialized
      if (value["materialized"]) {
        value["children"] = value["materialized"]["query_block"];
        if (value["children"]) value["children"]["Node Type"] = "Materialize";

        handleTables(value["children"], value["children"], false);
      }

      // handle operations
      const opType = opTypes.find((type) => type[0] === i);
      if (opType) value["Node Type"] = opType[1];

      // handle Table
      if (i.includes("table")) {
        const scanType = scanTypes.find(
          (type) => type[0] === value["access_type"]
        );
        value["Node Type"] = scanType ? scanType[1] : "Unknown";
      }

      searchMariaDB(value);
    }
  }

  for (var i in data) {
    process(i, data[i]);
  }
}

function handleTables(value, parent, isSubquery) {
  // Subquery에서 table 간 expression cache 사용 여부가 다른 경우 처리 (예) Q21)
  if (isSubquery && parent[0]["expression_cache"] && parent[1]) {
    const tables = Object.keys(parent[1]["query_block"]).filter(
      (key) =>
        key.includes("table") ||
        key.includes("subqueries") ||
        key.includes("read_sorted_file")
    );

    for (let table of tables) {
      parent[0]["expression_cache"]["query_block"][table] =
        parent[1]["query_block"][table];
    }
  }

  // children으로 가지고 있는 table (or subquery) 모두 추출
  let tableKeys = Object.keys(value).filter(
    (key) =>
      key.includes("table") ||
      key.includes("subqueries") ||
      key.includes("read_sorted_file") // Q15
  );

  if (tableKeys.length === 1) {
    // table 1개인 경우 - Scan
    if (isSubquery) {
      parent["children"] = { "Node Type": "Subquery" };
      parent["children"]["children"] = value[tableKeys[0]];
    } else {
      parent["children"] = value[tableKeys[0]];
    }
  } else if (tableKeys.length > 1) {
    // table 여러개인 경우 - Join
    const containsSub = tableKeys[tableKeys.length - 1] === "subqueries";
    const lastTable = parseInt(
      tableKeys[
        containsSub ? tableKeys.length - 2 : tableKeys.length - 1
      ].replace("table", "")
    );

    parent["children"] = {
      "Node Type": isSubquery ? "Attached Subquery" : "Join",
    };
    if (isSubquery) {
      parent["children"]["children"] = { "Node Type": "Join" };
    }
    handleJoin(
      value,
      isSubquery ? parent["children"]["children"] : parent["children"],
      tableKeys.length,
      lastTable,
      containsSub
    );
  }
}

function handleJoin(original, data, num, curr, containsSub) {
  const temp_table_node = { "Node Type": "Join" };

  if (num > 2) {
    if (containsSub) {
      handleTables(
        original["subqueries"][0]["expression_cache"]
          ? original["subqueries"][0]["expression_cache"]["query_block"]
          : original["subqueries"][0]["query_block"],
        original["subqueries"],
        true
      );
    }

    while (!original[`table${curr}`]) curr--;

    data["children"] = [
      temp_table_node,
      containsSub
        ? original["subqueries"]["children"]
        : original[`table${curr}`],
    ];
    data["children"]["Node Type"] = "Join";

    handleJoin(
      original,
      data["children"][0],
      num - 1,
      containsSub ? curr : curr - 1
    );
  } else if (num === 2) {
    if (containsSub) {
      handleTables(
        original["subqueries"][0]["expression_cache"]
          ? original["subqueries"][0]["expression_cache"]["query_block"]
          : original["subqueries"][0]["query_block"],
        original["subqueries"],
        true
      );

      data["children"] = [
        original[`table${curr}`],
        original["subqueries"]["children"],
      ];
      data["children"]["Node Type"] = "Join";
    } else {
      if (original[`table${curr - 1}`])
        data["children"] = [
          original[`table${curr - 1}`],
          original[`table${curr}`],
        ];
      else if (
        original["read_sorted_file"] &&
        original["read_sorted_file"]["filesort"]
      ) {
        // handle Q15
        const table = Object.keys(
          original["read_sorted_file"]["filesort"]
        ).filter((key) => key.includes("table"));

        original["read_sorted_file"]["filesort"]["Node Type"] = "Sort";
        original["read_sorted_file"]["filesort"]["children"] =
          original["read_sorted_file"]["filesort"][table];

        data["children"] = [
          original["read_sorted_file"]["filesort"],
          original[`table${curr}`],
        ];
      }
    }
  }
}

export function traversePostgreSQL(node, result) {
  const nodeType = node["Node Type"];
  const cost = node["Total Cost"] - node["Startup Cost"];

  result[nodeType] = (result[nodeType] || 0) + cost;

  if (node.children) {
    for (const child of node.children) {
      traversePostgreSQL(child, result);
    }
  }
}
export function traverseMySQL(node, result) {
  const nodeType = node["Node Type"];

  // extract cost information from the node
  let cost = Object.entries(node["cost_info"] || {})
    .filter(([key]) => key.includes("cost"))
    .map(([_, value]) => parseFloat(value) || 0);

  cost = d3.sum(cost);

  result[nodeType] = (result[nodeType] || 0) + cost;

  if (node.children) {
    for (const child of node.children) {
      traverseMySQL(child, result);
    }
  }
}

export function traverseMariaDB(node, result) {
  const nodeType = node["Node Type"];
  const cost = node["r_total_time_ms"];
  result[nodeType] = (result[nodeType] || 0) + cost;

  if (node.children) {
    for (const child of node.children) {
      traverseMariaDB(child, result);
    }
  }
}
