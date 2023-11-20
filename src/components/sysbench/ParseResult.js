import { useEffect, useState } from "react";
import LineChart from "./LineChart";

const ParseResult = ({ files }) => {
  const [contents, setContents] = useState([]);
  const [queryResults, setQueryResults] = useState([]);

  useEffect(() => {
    if (files && files.length === 0) {
      // 업로드 한 파일 없는 경우
      setContents([]);
    } else if (files && files.length > 0) {
      const fileContents = [];

      // create a FileReader for each file
      files.forEach((file) => {
        const fileReader = new FileReader();

        fileReader.onload = () => {
          fileContents.push(fileReader.result);
          setContents(fileContents);
        };

        // read the file as text
        fileReader.readAsText(file);
      });
    }
  }, [files]);

  useEffect(() => {
    const results = [];
    const lines = contents.toString().split("\n");

    for (let line of lines) {
      // Stop at Latency histogram
      if (line.includes("Latency histogram (values are in milliseconds)")) {
        break;
      }

      const match = line.match(
        /\[\s*(\d+s)\s*\]\s*thds:\s*(\d+)\s*tps:\s*([\d.]+)\s*qps:\s*([\d.]+).*lat\s*\(ms,99%\):\s*([\d.]+)\s*err\/s:\s*([\d.]+)/
      );
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
    setQueryResults(results);
  }, [contents]);

  return (
    <div>
      <h1 className="title">Benchmark Result</h1>
      <div className="Line-container">
        <LineChart
          // key={index}
          queryResults={queryResults}
        />
      </div>
    </div>
  );
};

export default ParseResult;
