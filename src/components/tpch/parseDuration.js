/*
 * parseDuration.js: TPC-H 결과 전처리
 * 데이터베이스마다 함수 추가하는 방식으로 구현 가능
 */

import * as d3 from "d3";

/*
 * 1. PostgreSQL
 */
export function parseDurPostgreSQL(content, fileIndex) {
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

/*
 * 2. MariaDB
 */
export function parseDurMariaDB(content, fileIndex) {
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

export function retrieveCost(node, result) {
  const nodeType = node["Node Type"];
  let cost;

  if (nodeType !== "Limit") {
    if (node["Total Cost"] && node["Startup Cost"]) {
      // PostgreSQL
      cost = node["Total Cost"] - node["Startup Cost"];
    } else if (node["cost_info"]) {
      // MySQL
      cost = d3.sum(
        Object.entries(node["cost_info"] || {})
          .filter(([key]) => key.includes("cost"))
          .map(([_, value]) => parseFloat(value) || 0)
      );
    } else if (node["r_total_time_ms"]) {
      // MariaDB
      cost = node["r_total_time_ms"];
    } else {
      cost = 0;
    }
  }

  result[nodeType] = (result[nodeType] || 0) + cost;

  if (node.children) {
    for (const child of node.children) {
      retrieveCost(child, result);
    }
  }
}
