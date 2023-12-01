import { useContext, useEffect, useState } from "react";
import QueryPlanView from "./QueryPlanView";
import { TpchContext } from "../../contexts/TpchContext";
import { Card } from "@material-tailwind/react";

function ParseQueryPlan({ files }) {
  const { selectedQuery } = useContext(TpchContext);
  const [queryPlans, setQueryPlans] = useState([]);

  useEffect(() => {
    const loadFiles = async () => {
      if (files && files.length > 0) {
        const planContents = [];

        for (const file of files) {
          const fileContent = await readFile(file);

          // default: try PostgreSQL
          let plans = extractPostgreSQL(fileContent);
          // 실패 시 try MySQL
          if (plans.length === 0) plans = extractMySQL(fileContent);

          planContents.push(plans);
        }

        setQueryPlans(planContents);
      } else {
        // 업로드 한 파일 없는 경우
        setQueryPlans([]);
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

  /* input preprocessing + query plan update */
  const extractPostgreSQL = (content) => {
    const regex = /\[(.*?)\](?=\s*\()/gs;
    let match = null;
    const plans = [];

    while ((match = regex.exec(content)) !== null) {
      // extract plan and remove every "+"
      let plan = match[1].replace(/\+/g, "");

      // d3의 계층구조 따르기 위해 "Plans"를 "children"으로 대체
      plan = plan.replace(/"Plans":/g, '"children":');

      plans.push(JSON.parse(plan));
    }

    return plans;
  };

  const extractMySQL = (content) => {
    const regex = /EXPLAIN([\s\S]*?)Query_ID/g;
    let match = null;
    const plans = [];

    const childrenToArray = (obj) => {
      if (obj && obj.children && !Array.isArray(obj.children)) {
        obj.children = [obj.children];
      }

      if (obj && typeof obj === "object") {
        for (const key in obj) {
          if (
            Array.isArray(obj[key]) ||
            (obj[key] && typeof obj[key] === "object")
          ) {
            obj[key] = childrenToArray(obj[key]);
          }
        }
      }

      return obj;
    };

    while ((match = regex.exec(content)) !== null) {
      // extract plan and remove every "\n"
      let plan = match[1].replace(/\\n/g, "");

      // 1. replace "query_block" to "Plan"
      plan = plan.replace(/"query_block": {/, '"Plan": {"Node Type": "Limit",');

      // 2. handle "grouping_operation", "ordering_operation", "duplicates_removal"
      plan = plan.replace(
        /"grouping_operation": {/g,
        '"children":{"Node Type": "Group",'
      );
      plan = plan.replace(
        /"ordering_operation": {/g,
        '"children":{"Node Type": "Order",'
      );
      plan = plan.replace(
        /"duplicates_removal": {/g,
        '"children":{"Node Type": "Distinct",'
      );

      // 3. handle "nested loop"
      plan = plan.replace(/"nested_loop"/g, '"children"');

      // 4. handle table which is scan
      plan = plan.replace(/table_name/g, "Relation Name");
      plan = plan.replace(/"table": {/g, '"children":{"Node Type": "Scan",');

      // 5. handle subqueries

      try {
        let jsonPlan = JSON.parse(plan);

        jsonPlan = childrenToArray(jsonPlan);

        plans.push(jsonPlan);
      } catch (error) {
        console.error("Error parsing JSON:", error);
      }
    }

    return plans;
  };

  return (
    <div>
      <h1 className="title">Query Plan</h1>
      <div className="plan-container">
        {queryPlans.map((plans, index) =>
          plans.length > 0 && plans[selectedQuery] ? (
            <Card key={index}>
              <QueryPlanView
                key={index}
                width={(document.body.clientWidth * 0.4) / queryPlans.length}
                plan={plans[selectedQuery].Plan}
              />
            </Card>
          ) : null
        )}
      </div>
    </div>
  );
}

export default ParseQueryPlan;
