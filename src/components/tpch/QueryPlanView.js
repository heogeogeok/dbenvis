import { useEffect, useState, useRef } from "react";
import * as d3 from "d3";

function QueryPlanView({ files }) {
  const [contents, setContents] = useState([]);
  const [queryPlans, setQueryPlans] = useState([]);

  useEffect(() => {
    if (files && files.length > 0) {
      const fileContents = [];

      // create a FileReader for each file */
      files.forEach((file) => {
        const fileReader = new FileReader();

        fileReader.onload = () => {
          fileContents.push(fileReader.result);
          setContents((current) => [...current, ...fileContents]);
        };

        // read the file as text
        fileReader.readAsText(file);
      });
    }
  }, [files]);

  useEffect(() => {
    // parse query plan and convert it as JSON
    const parsedQueryPlans = contents.map((content) => {
      const start = content.indexOf("[");
      const end = content.lastIndexOf("]");

      const raw = JSON.stringify(
        content.substring(start, end + 1),
        null,
        2
      ).replace(/\+$/gm, "");

      console.log(raw);

      return JSON.parse(raw);
    });

    setQueryPlans((current) => [...current, ...parsedQueryPlans]);
  }, [contents]);

  useEffect(() => {}, [queryPlans]);

  return (
    <div>
      <h1>Query Plan View</h1>
      <div>{queryPlans}</div>
    </div>
  );
}

export default QueryPlanView;
