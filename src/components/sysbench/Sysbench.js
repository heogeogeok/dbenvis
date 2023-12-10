import { useEffect, useState, useContext } from "react";
import { SysbenchContext } from "../../contexts/SysbenchContext";
import LineChart from "./LineChart";
import BarChart from "./BarChart";
import "../../assets/stylesheets/Sysbench.css";

const Sysbench = ({ files }) => {
  const { avgMetric, setAvgMetric } = useContext(SysbenchContext);
  const initAvgMetric = [...avgMetric];

  const [queryResults, setQueryResults] = useState([]);

  useEffect(() => {
    const loadFiles = async () => {
      if (files && files.length > 0) {
        const fileContents = [];
        const avgValues = [];

        let index = 0;
        for (const file of files) {
          const fileContent = await readFile(file);
          const results = extractResults(fileContent);

          fileContents.push({ results });
          extractAvg(index, fileContent, avgValues);

          index++;
        }

        setQueryResults(fileContents);
        setAvgMetric(avgValues);
      } else {
        // 업로드 한 파일 없는 경우
        setQueryResults([]);
        setAvgMetric([]);
      }
    };

    loadFiles();
  }, [files, setAvgMetric]);

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
        // const [_, time, thds, tps, qps, lat, err] = match;
        results.push({
          time: parseInt(match[1]),
          tps: parseFloat(match[3]),
          qps: parseFloat(match[4]),
          lat: parseFloat(match[5]),
        });
      }
    }
    return results;
  };

  const extractAvg = (index, content, result) => {
    // tps
    let regex = /transactions:\s+\d+\s+\(([\d.]+)\s+per sec.\)/;
    let match = content.match(regex);
    const tps = parseFloat(match[1]);

    // qps
    regex = /queries:\s+\d+\s+\(([\d.]+)\s+per sec.\)/;
    match = content.match(regex);
    const qps = parseFloat(match[1]);

    // latency
    regex =
      /Latency \(ms\):\s+min:\s+([\d.]+)\s+avg:\s+([\d.]+)\s+max:\s+([\d.]+)\s+99th percentile:\s+([\d.]+)\s+sum:\s+([\d.]+)/;
    match = content.match(regex);

    const lat = {
      min: parseFloat(match[1]),
      avg: parseFloat(match[2]),
      max: parseFloat(match[3]),
      percentile99: parseFloat(match[4]),
      sum: parseFloat(match[5]),
    };

    // queries performed
    regex =
      /queries performed:\s+read:\s+(\d+)\s+write:\s+(\d+)\s+other:\s+(\d+)\s+total:\s+(\d+)/;
    match = content.match(regex);

    const queries = {
      read: parseInt(match[1]),
      write: parseInt(match[2]),
      other: parseInt(match[3]),
      total: parseInt(match[4]),
    };

    result.push({
      index,
      tps,
      qps,
      lat,
      queries,
    });
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
                initAvgMetric={initAvgMetric}
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
