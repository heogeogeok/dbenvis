import { useContext, useEffect, useState } from 'react'
import QueryPlanView from './QueryPlanView'
import DurationCard from './DurationCard'
import { TpchContext } from '../../contexts/TpchContext'
import { Card } from '@material-tailwind/react'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Select from 'react-select'

import {
  parseExpPostgreSQL,
  parseExpMySQL,
  parseExpMariaDB,
} from './parseExplain'

function ParseQueryPlan({ files }) {
  const { selectedQuery, durations } = useContext(TpchContext)
  const [queryPlans, setQueryPlans] = useState([])
  const [selectedCheckbox, setSelectedCheckbox] = useState('Both')
  const [selectedValue, setSelectedValue] = useState('none')

  const options = [
    { value: 'none', label: 'none' },
    { value: 'cost', label: 'Cost' },
    { value: 'row', label: 'Row' },
  ]
  const handleCheckboxChange = event => {
    setSelectedCheckbox(event.target.value)
  }

  const handleSelectionChange = selectedOption => {
    setSelectedValue(selectedOption.value)
  }

  useEffect(() => {
    const loadFiles = async () => {
      if (files && files.length > 0) {
        const planContents = []

        for (const file of files) {
          const fileContent = await readFile(file)

          // default: try PostgreSQL
          let plans = parseExpPostgreSQL(fileContent)

          // 실패 시
          if (plans.length === 0) {
            const regex = /cost_info/
            if (regex.test(fileContent)) {
              // run MySQL
              plans = parseExpMySQL(fileContent)
            } else {
              // run MariaDB
              plans = parseExpMariaDB(fileContent)
            }
          }

          planContents.push(plans)
        }

        setQueryPlans(planContents)
      } else {
        // 업로드 한 파일 없는 경우
        setQueryPlans([])
      }
    }

    loadFiles()
  }, [files])

  const readFile = file => {
    return new Promise(resolve => {
      const fileReader = new FileReader()

      fileReader.onload = () => {
        resolve(fileReader.result)
      }

      // read the file as text
      fileReader.readAsText(file)
    })
  }

  return (
    <div>
      <h1 className="title">Query Plan</h1>
      <div className="control-panel">
        <div className="control-panel-metric">
          <p>Select Metric:</p>
          <Select
            options={options}
            defaultValue={options[0]}
            onChange={handleSelectionChange}
          />
        </div>
        <div className="control-panel-term">
          <p>Select Term: </p>
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedCheckbox === 'PostgreSQL'}
                onChange={handleCheckboxChange}
                value="PostgreSQL"
              />
            }
            label="PostgreSQL"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedCheckbox === 'MySQL'}
                onChange={handleCheckboxChange}
                value="MySQL"
              />
            }
            label="MySQL"
          />
          <FormControlLabel
            control={
              <Checkbox
                defaultChecked
                checked={selectedCheckbox === 'Both'}
                onChange={handleCheckboxChange}
                value="Both"
              />
            }
            label="Both"
          />
        </div>
      </div>
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
              <Card key={index} className="plan-card">
                <DurationCard
                  duration={durations.find(
                    duration =>
                      duration.fileIndex === index &&
                      duration.queryNumber === (selectedQuery + 1).toString()
                  )}
                />
                <QueryPlanView
                  checkbox={selectedCheckbox}
                  key={index}
                  width={
                    (document.body.clientWidth * 0.45 - 10) / queryPlans.length
                  } // default padding 고려하여 -10
                  plan={plans[selectedQuery].Plan}
                  selectedOption={selectedValue}
                />
              </Card>
            </div>
          ) : null
        )}
      </div>
    </div>
  )
}

export default ParseQueryPlan
