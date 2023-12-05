import { useContext, useState } from "react";
import FileInput from "./FileInput";
import { TpchContext } from "../contexts/TpchContext";
import "../assets/stylesheets/Sidebar.css";
import {
  Card,
  List,
  ListItem,
  ListItemPrefix,
  Accordion,
  AccordionHeader,
  AccordionBody,
  Checkbox,
} from "@material-tailwind/react";
import {
  PresentationChartBarIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/solid";
import { ChevronRightIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

function Sidebar(props) {
  const {
    selected,
    setSelected,
    resultFiles,
    setResultFiles,
    explainFiles,
    setExplainFiles,
  } = props;

  const [open, setOpen] = useState([]);
  const [expand, setExpand] = useState(false);

  const { selectedQuery, setSelectedQuery } = useContext(TpchContext);

  const handleOpen = (value) => {
    setOpen(open === value ? 0 : value);
  };

  const handleSelect = (value) => {
    if (value !== selected && selected !== null) {
      const confirmed = window.confirm(
        "현재 내용이 저장되지 않습니다.\n변경하시겠습니까?"
      );

      if (confirmed) {
        setSelected(value);
        setResultFiles([]);
        setExplainFiles([]);
      }
    }

    if (selected === null) {
      setSelected(value);
      setResultFiles([]);
      setExplainFiles([]);
    }
  };

  const handleExpand = () => {
    setExpand(expand === true ? false : true);
  };

  const handleCheckboxChange = (queryNumber) => {
    setSelectedQuery(queryNumber);
  };

  return (
    <Card className="main-card">
      <List className="pt-4 gap-4">
        {/* 메인 메뉴 1: OLAP */}
        <Accordion
          open={open === 1}
          icon={
            <ChevronDownIcon
              strokeWidth={2.5}
              className={`mx-auto h-3 w-3 transition-transform ${
                open === 1 ? "rotate-180" : ""
              }`}
            />
          }
        >
          <ListItem className="p-1" selected={open === 1} ripple={false}>
            <AccordionHeader
              onClick={() => handleOpen(1)}
              className="p-0 border-b-0"
            >
              <ListItemPrefix>
                <PresentationChartBarIcon className="h-4 w-4" />
              </ListItemPrefix>
              <p className="main-menu-text">OLAP</p>
            </AccordionHeader>
          </ListItem>
          <AccordionBody className="p-0">
            <List>
              {/* 서브 메뉴 1-1: TPC-H */}
              <ListItem
                className="p-1 hover:bg-transparent"
                onClick={() => {
                  handleSelect("TPC-H");
                }}
                ripple={false}
              >
                <Accordion open={expand === true}>
                  <AccordionHeader
                    onClick={() => handleExpand()}
                    className="p-0 border-b-0"
                  >
                    <ListItemPrefix>
                      <ChevronDownIcon
                        strokeWidth={2.5}
                        className={`mx-auto h-3 w-3 transition-transform ${
                          expand === true ? "rotate-180" : ""
                        }`}
                      />
                    </ListItemPrefix>
                    <p className="sub-menu-text">TPC-H</p>
                  </AccordionHeader>
                  {/* 쿼리 선택 */}
                  <AccordionBody className="h-40 p-0 overflow-y-auto">
                    <List>
                      {[...Array(21).keys()].map((queryNumber) => (
                        <ListItem
                          key={queryNumber}
                          className="h-6 hover:after:opacity-0"
                          ripple={false}
                        >
                          <ListItemPrefix>
                            <Checkbox
                              className="w-4 h-4 hover:before:opacity-0"
                              checked={selectedQuery === queryNumber}
                              onChange={() => handleCheckboxChange(queryNumber)}
                              ripple={false}
                            />
                          </ListItemPrefix>
                          <p className="query-menu-text">
                            Query {queryNumber + 1}
                          </p>
                        </ListItem>
                      ))}
                    </List>
                  </AccordionBody>
                </Accordion>
              </ListItem>
            </List>
          </AccordionBody>
        </Accordion>
        {/* 메인 메뉴 2: OLTP */}
        <Accordion
          open={open === 2}
          icon={
            <ChevronDownIcon
              strokeWidth={2.5}
              className={`mx-auto h-3 w-3 transition-transform ${
                open === 2 ? "rotate-180" : ""
              }`}
            />
          }
        >
          <ListItem className="p-1" selected={open === 2}>
            <AccordionHeader
              onClick={() => handleOpen(2)}
              className="p-0 border-b-0"
            >
              <ListItemPrefix>
                <ArrowsRightLeftIcon className="h-4 w-4" />
              </ListItemPrefix>
              <p className="main-menu-text">OLTP</p>
            </AccordionHeader>
          </ListItem>
          <AccordionBody className="p-0">
            <List>
              {/* 서브 메뉴 2-1: sysbench */}
              <ListItem
                className="p-1"
                onClick={() => handleSelect("sysbench")}
              >
                <ListItemPrefix>
                  <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                </ListItemPrefix>
                <p className="sub-menu-text">sysbench</p>
              </ListItem>
            </List>
          </AccordionBody>
        </Accordion>
        <hr />
        {/* OLAP benchmark의 경우 query plan 추가 */}
        {selected === "TPC-H" && (
          <div>
            <FileInput
              inputType={"Upload Query Plans"}
              selected={selected}
              files={explainFiles}
              setFiles={setExplainFiles}
            />
            <hr className="my-4" />
          </div>
        )}
        {/* 결과 파일 업로드 */}
        <FileInput
          inputType={"Upload Results"}
          selected={selected}
          files={resultFiles}
          setFiles={setResultFiles}
        />
      </List>
    </Card>
  );
}

export default Sidebar;
