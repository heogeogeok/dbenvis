import { useEffect, useState } from "react";
import QueryPlanView from "./QueryPlanView";

function ParseQueryPlan({ files }) {
  const [contents, setContents] = useState([]);
  const [queryPlans, setQueryPlans] = useState([]);

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

  /* input preprocessing + query plan update */
  useEffect(() => {
    const planContents = [];

    contents.forEach((content) => {
      const regex = /\[([\s\S]*)]/;
      const match = content.match(regex);

      if (match) {
        // extract plan and remove every "+"
        let plan = match[1].replace(/\+/g, "");

        // d3의 계층구조 따르기 위해 "Plans"를 "children"으로 대체
        plan = plan.replace(/"Plans":/g, '"children":');

        planContents.push(JSON.parse(plan));
      }
    });

    setQueryPlans(planContents);
  }, [contents]);

  return (
    <div>
      <h1 className="title">Query Plan</h1>
      <div className="plan-container">
        {queryPlans.map((queryPlan, index) => (
          <QueryPlanView
            key={index}
            width={400 / queryPlans.length}
            marginX={50 / queryPlans.length}
            plan={queryPlan.Plan}
          />
        ))}
      </div>
    </div>
  );
}

export default ParseQueryPlan;
