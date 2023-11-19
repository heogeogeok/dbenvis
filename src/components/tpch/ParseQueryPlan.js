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
    // preprocess the input
    contents.forEach((content) => {
      const regex = /\[([\s\S]*)]/;
      const match = content.match(regex);

      if (match) {
        // extract plan and remove every "+"
        let plan = match[1].replace(/\+/g, "");

        // replace "Plans" with "children"
        plan = plan.replace(/"Plans":/g, '"children":');

        setQueryPlans((current) => [...current, JSON.parse(plan)]);
      }
    });
  }, [contents]);

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
