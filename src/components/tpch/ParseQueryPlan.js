import { useContext, useEffect, useState } from "react";
import QueryPlanView from "./QueryPlanView";
import { TpchContext } from "../../contexts/TpchContext";

function ParseQueryPlan({ files }) {
  const { selectedQuery } = useContext(TpchContext);
  const [queryPlans, setQueryPlans] = useState([]);

  useEffect(() => {
    const loadFiles = async () => {
      if (files && files.length > 0) {
        const planContents = [];

        for (const file of files) {
          const fileContent = await readFile(file);
          const plans = extractPlans(fileContent);

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
  const extractPlans = (content) => {
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

  return (
    <div>
      <h1 className="title">Query Plan</h1>
      <div className="plan-container">
        {queryPlans.map((array, index) =>
          array.length > 0 && array[selectedQuery] ? (
            <QueryPlanView
              key={index}
              width={(document.body.clientWidth * 0.4) / queryPlans.length}
              plan={array[selectedQuery].Plan}
            />
          ) : null
        )}
      </div>
    </div>
  );
}

export default ParseQueryPlan;
