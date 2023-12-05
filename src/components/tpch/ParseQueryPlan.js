import { useContext, useEffect, useState } from "react";
import QueryPlanView from "./QueryPlanView";
import { TpchContext } from "../../contexts/TpchContext";
import { Card } from "@material-tailwind/react";

import { parsePostgreSQL, parseMySQL } from "./parseExplain";

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
          let plans = parsePostgreSQL(fileContent);
          // 실패 시 try MySQL
          if (plans.length === 0) plans = parseMySQL(fileContent);

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

  return (
    <div>
      <h1 className="title">Query Plan</h1>
      <div className="plan-container">
        {queryPlans.map((plans, index) =>
          plans.length > 0 && plans[selectedQuery] ? (
            <div>
              {files[index] && files[index].name ? (
                <h1 className="filename-title">{files[index].name}</h1>
              ) : null}
              <Card key={index}>
                <QueryPlanView
                  key={index}
                  width={(document.body.clientWidth * 0.45) / queryPlans.length}
                  plan={plans[selectedQuery].Plan}
                />
              </Card>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

export default ParseQueryPlan;
