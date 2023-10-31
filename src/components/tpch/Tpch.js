import { useState, useEffect } from "react";
import QueryPlanView from "./QueryPlanView";
import CompareView from "./CompareView";
import resultPath from "../../data/tpch-result";

function Tpch() {
  const [fileContents, setFileContents] = useState("");

  const mainWidth = 200;
  const subWidth = 150;
  const margin = 20;
  const radius = 1.5;
  const barPadding = 0.3;

  async function getTextFile(filepath) {
    return fetch(filepath).then((resp) => resp.text());
  }

  /* 데이터 파싱 */
  const parseQueryTimes = (fileContents) => {
    const regex = /Query (\d+) \*\*[\s\S]+?Time: (\d+\.\d+) ms/g;
    const queryTimes = [];
    let match;

    while ((match = regex.exec(fileContents)) !== null) {
      const queryNumber = match[1];
      const timeInSeconds = parseFloat(match[2]) / 1000;
      queryTimes.push({ queryNumber, timeInSeconds });
    }

    return queryTimes;
  };

  const [queryTimes, setQueryTimes] = useState([]);

  useEffect(() => {
    getTextFile(resultPath)
      .then((text) => {
        setFileContents(text);
      })
      .catch((error) => {
        console.error(error);
      });

    const extractedQueryTimes = parseQueryTimes(fileContents);
    setQueryTimes(extractedQueryTimes);
  }, [fileContents]);

  return (
    <>
      <QueryPlanView files={files} />
      <CompareView
        size={mainWidth}
        data={queryTimes}
        margin={margin}
        radius={radius}
        barPadding={barPadding}
      />
    </>
  );
}

export default Tpch;
