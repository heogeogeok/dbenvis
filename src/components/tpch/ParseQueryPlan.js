import { useEffect, useState } from "react";
import QueryPlanView from "./QueryPlanView";

function ParseQueryPlan({ files }) {
  const [contents, setContents] = useState([]);
  const [queryPlans, setQueryPlans] = useState([]);

  useEffect(() => {
    if (files && files.length > 0) {
      const fileContents = [];

      // create a FileReader for each file
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
    // parse query plan and extract "Plan" element
    contents.forEach((content) => {
      const regex = /\[([\s\S]*)]/;
      const match = content.match(regex);

      console.log(match[1]);

      if (match) {
        let planElement = match[1];
        // remove every "+"
        planElement = planElement.replace(/\+/g, "");

        setQueryPlans((current) => [...current, JSON.parse(planElement)]);
      }
    });
  }, [contents]);

  useEffect(() => {
    console.log("queryPlans changed:", queryPlans);
  }, [queryPlans]);

  return (
    <div>
      <h1>Query Plan View</h1>
      {queryPlans.map((queryPlan, index) => (
        <QueryPlanView key={index} plan={queryPlan.Plan} />
      ))}
    </div>
  );
}

export default ParseQueryPlan;
