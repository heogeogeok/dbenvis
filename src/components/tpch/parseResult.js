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
