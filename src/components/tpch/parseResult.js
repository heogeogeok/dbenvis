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
  
  let i=1;
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

// recursive function to traverse the nested structure
export function traversePlan(node, fileIndex, result) {
  result.push({
    "Node Type": node["Node Type"],
    Cost: node["Total Cost"] - node["Startup Cost"],
    fileIndex: fileIndex,
  });
  // check if 'children' property exists
  if ("children" in node) {
    // iterate over each child
    for (const child of node.children) {
      // recursively call traversePlan for each child
      traversePlan(child, fileIndex, result);
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
