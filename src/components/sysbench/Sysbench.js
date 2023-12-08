import { useEffect, useState, useContext } from "react";
import { SysbenchContext } from "../../contexts/SysbenchContext";
import LineChart from "./LineChart";
import BarChart from "./BarChart";
import "../../assets/stylesheets/Sysbench.css";

const Sysbench = ({ files }) => {
  const { setAvgTps } = useContext(SysbenchContext);

  const [queryResults, setQueryResults] = useState([]);

  useEffect(() => {
    const loadFiles = async () => {
      if (files && files.length > 0) {
        const fileContents = [];
        const avgTpsValues = [];

        for (const file of files) {
          const fileContent = await readFile(file);
          const results = extractResults(fileContent);

          fileContents.push({ results });
          avgTpsValues.push(extractAvgTps(fileContent));
        }

        setQueryResults(fileContents);
        setAvgTps(avgTpsValues);
      } else {
        // 업로드 한 파일 없는 경우
        setQueryResults([]);
        setAvgTps([]);
      }
    };

    loadFiles();
  }, [files]);

  const readFile = (file) => {
    return new Promise((resolve) => {
      const fileReader = new FileReader();

      fileReader.onload = () => {
        resolve(fileReader.result);
      };

      // read the file as text
      fileReader.readAsText(file);
    });
  };

  /* input preprocessing + query result update */
  const extractResults = (content) => {
    const regex =
      /\[\s*(\d+s)\s*\]\s*thds:\s*(\d+)\s*tps:\s*([\d.]+)\s*qps:\s*([\d.]+).*lat\s*\(ms,99%\):\s*([\d.]+)\s*err\/s:\s*([\d.]+)/;
    let match = null;
    const results = [];

    const lines = content.toString().split("\n");

    for (let line of lines) {
      // Ssop at Latency histogram
      if (line.includes("Latency histogram (values are in milliseconds)")) {
        break;
      }

      match = line.match(regex);

      if (match) {
        const [_, time, thds, tps, qps, lat, err] = match;
        results.push({
          time: parseInt(time),
          tps: parseFloat(tps),
          qps: parseFloat(qps),
          lat: parseFloat(lat),
        });
      }
    }
    return results;
  };

  const extractAvgTps = (content) => {
    const regex = /transactions:\s+\d+\s+\(([\d.]+)\s+per sec.\)/;
    const match = content.match(regex);

    if (match) {
      const transactionsPerSec = parseFloat(match[1]); // per sec 값 추출
      return transactionsPerSec;
    } else {
      console.error("Unable to extract average from the content");
      return null;
    }
  };

  return (
    <div className="sysbench-container">
      <div className="chart-container">
        <h1 className="title">sysbench Result</h1>
        {queryResults.length > 0 && (
          <div className="line-chart-container">
            {queryResults.map((results, index) => (
              <LineChart
                key={index}
                fileIndex={index}
                files={files}
                queryResults={results.results}
              />
            ))}
          </div>
        )}
      </div>
      <div className="chart-container">
        <h1 className="title">Compare View</h1>
        {queryResults.length > 0 && <BarChart files={files} />}
      </div>
    </div>
  );
};

export default Sysbench;
