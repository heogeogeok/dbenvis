import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";

const MultiGraphCompare = ({ files, ...props }) => {
  const [contents, setContents] = useState([]);
  const [queryResults, setQueryResults] = useState([]);

  const parseQueryResults = (fileContents) => {
    const results = [];
    const lines = fileContents.split("\n");

    for (let line of lines) {
      // Stop at Latency histogram
      if (line.includes("Latency histogram (values are in milliseconds)")) {
        break;
      }

      const match = line.match(
        /\[\s*(\d+s)\s*\]\s*thds:\s*(\d+)\s*tps:\s*([\d.]+)\s*qps:\s*([\d.]+).*lat\s*\(ms,99%\):\s*([\d.]+)\s*err\/s:\s*([\d.]+)/
      );
      if (match) {
        const [_, time, thds, tps, qps, lat, errPerS] = match;
        results.push({
          time,
          thds: parseInt(thds),
          tps: parseFloat(tps),
          qps: parseFloat(qps),
          lat: parseFloat(lat),
          errPerS: parseFloat(errPerS),
        });
      }
    }
    console.log(results);
    return results;
  };

  useEffect(() => {
    if (files && files.length > 0) {
      const fileContents = [];

      /* Create a FileReader for each file */
      files.forEach((file) => {
        const fileReader = new FileReader();

        fileReader.onload = () => {
          fileContents.push(fileReader.result);
          setContents(fileContents);
          console.log(fileReader.result); // logging after reading file
        };

        /* Read the file as text */
        fileReader.readAsText(file);
      });
    }
  }, [files]);

  useEffect(() => {
    const extractedQueryResults = parseQueryResults(contents);
    setQueryResults(extractedQueryResults);
  }, [contents]);

  return <div></div>;
};

export default MultiGraphCompare;
