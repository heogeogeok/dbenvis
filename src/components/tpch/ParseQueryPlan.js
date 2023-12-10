import { useContext, useEffect, useState } from "react";
import QueryPlanView from "./QueryPlanView";
import DurationCard from "./DurationCard";
import { TpchContext } from "../../contexts/TpchContext";
import { Card } from "@material-tailwind/react";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Select from "react-select";

import "../../assets/stylesheets/Tpch.css";

import {
  parseExpPostgreSQL,
  parseExpMySQL,
  parseExpMariaDB,
} from "./parseExplain";

function ParseQueryPlan({ files }) {
  const { selectedQuery, durations } = useContext(TpchContext);

  const [queryPlans, setQueryPlans] = useState([]);
  const [selectedTerm, setselectedTerm] = useState("Default");
  const [selectedMetric, setselectedMetric] = useState("none");

  const options = [
    { value: "none", label: "none" },
    { value: "cost", label: "Cost" },
    { value: "rows", label: "Rows" },
  ];

  const handleCheckboxChange = (event) => {
    setselectedTerm(event.target.value);
  };

  const handleSelectionChange = (selectedOption) => {
    setselectedMetric(selectedOption.value);
  };

  useEffect(() => {
    const loadFiles = async () => {
      if (files && files.length > 0) {
        const planContents = [];

        for (const file of files) {
          const fileContent = await readFile(file);

          // default: try PostgreSQL
          let plans = parseExpPostgreSQL(fileContent, false, null);

          // 실패 시
          if (plans.length === 0) {
            const regex = /cost_info/;
            if (regex.test(fileContent)) {
              // run MySQL
              plans = parseExpMySQL(fileContent, false, null);
            } else {
              // run MariaDB
              plans = parseExpMariaDB(fileContent, false, null);
            }
          }

          if (plans.length !== 0) planContents.push(plans); // explain 실패 시 저장하지 않음
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
      <p className="title">Query Plan Visualization</p>
      <div className="control-panel">
        <div className="control-panel-metric">
          <p>Metric:</p>
          <Select
            options={options}
            defaultValue={options[0]}
            onChange={handleSelectionChange}
            className="control-panel-options"
          />
        </div>
        <div className="control-panel-term">
          <p>Terminology:</p>
          {["Default", "PostgreSQL", "MariaDB / MySQL"].map((checkboxValue) => (
            <FormControlLabel
              key={checkboxValue}
              control={
                <Checkbox
                  checked={selectedTerm === checkboxValue}
                  onChange={handleCheckboxChange}
                  value={checkboxValue}
                  size="small"
                />
              }
              label={
                <div className={"control-panel-options"}>{checkboxValue}</div>
              }
            />
          ))}
        </div>
      </div>
      <hr />
      <div className="plan-container">
        {queryPlans.map((plans, index) =>
          plans.length > 0 && plans[selectedQuery] ? (
            <div>
              {files[index] && files[index].name ? (
                <div className="filename-title">
                  <p>
                    {files[index].name.length > 80 / files.length
                      ? `${files[index].name.slice(0, 80 / files.length)}...`
                      : files[index].name}
                  </p>
                </div>
              ) : null}
              <Card key={index}>
                <DurationCard
                  duration={durations.find(
                    (duration) =>
                      duration.fileIndex === index &&
                      duration.queryNumber === (selectedQuery + 1).toString()
                  )}
                />
                <QueryPlanView
                  key={index}
                  width={
                    (document.body.clientWidth * 0.45 - 10) / queryPlans.length
                  } // default padding 고려하여 -10
                  plan={plans[selectedQuery].Plan}
                  term={selectedTerm}
                  metric={selectedMetric}
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
