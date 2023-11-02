import { useState, useEffect } from "react";
import QueryPlanView from "./QueryPlanView";
import CompareView from "./CompareView";
import resultPath from "../../data/tpch-result";
import "../../assets/stylesheets/Tpch.css";
import {
  Card
} from "@material-tailwind/react";

function Tpch({ files }) {
  const [fileContents, setFileContents] = useState("");

  const size = 1000;
  const width = 430;
  const height = 200; 
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

    console.log(queryTimes);

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
    <div className="App">
      <div className="query-plan-container">
        <Card>
          <QueryPlanView files={files} />
        </Card>
      </div>
      <div className="comparison-view-container">
      <Card>
        <CompareView
           size={size}
           height={height}
           width={width}
           data={queryTimes}
           margin={margin}
           radius={radius}
           barPadding={barPadding}
        />
      </Card>
      </div>
    </div>
  );
}

export default Tpch;
