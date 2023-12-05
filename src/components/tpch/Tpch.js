import ParseQueryPlan from './ParseQueryPlan'
import CompareView from './CompareView'
import '../../assets/stylesheets/Tpch.css'
import { Card } from '@material-tailwind/react'

function Tpch(props) {
  const { resultFiles, explainFiles } = props

  return (
    <div className="tpch-container">
      <div className="plan-view-container">
        <Card>
          <ParseQueryPlan files={explainFiles} />
        </Card>
      </div>
      <div className="compare-view-container">
        <Card>
          <CompareView resultFiles={resultFiles} explainFiles={explainFiles} />
        </Card>
      </div>
    </div>
  )
}

export default Tpch
