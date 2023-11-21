import { useEffect, useState } from "react";
import LineChart from "./LineChart";
import { Card } from "@material-tailwind/react";

const ParseResult = ({ files }) => {
  const [queryResults, setQueryResults] = useState([]);

  useEffect(() => {
    const loadFiles = async () => {
      if (files && files.length > 0) {
        const fileContents = [];

        for (const file of files) {
          const fileContent = await readFile(file);
          const results = extractResults(fileContent);

          fileContents.push(results);
        }

        setQueryResults(fileContents);
      } else {
        // 업로드 한 파일 없는 경우
        setQueryResults([]);
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
      // Stop at Latency histogram
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

  return (
    <div>
      <h1 className="title">Benchmark Result</h1>
      {/* 차트 여러개인 경우 두개씩 보이도록 */}
      {queryResults.length >= 1 && (
        <div className="chart-container">
          {queryResults.length === 1 ? (
            <div>
              {queryResults.map((results, index) => (
                <LineChart
                  key={index}
                  width={0.4 * document.documentElement.clientWidth}
                  margin={0.03 * document.documentElement.clientWidth}
                  queryResults={results}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {queryResults.map((results, index) => (
                <Card>
                  <LineChart
                    key={index}
                    width={0.2 * document.documentElement.clientWidth}
                    margin={0.03 * document.documentElement.clientWidth}
                    queryResults={results}
                  />
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ParseResult;
