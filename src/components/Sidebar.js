import { useState } from "react";
import Logo from "../assets/images/logo.png";
import "../assets/stylesheets/Sidebar.css";
import FormControlLabel from '@mui/material/FormControlLabel';
import { Collapse, FormGroup } from "@mui/material";
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import IconButton from "@material-tailwind/react";

import {
  Card,
  Typography,
  List,
  ListItem,
  ListItemPrefix,
  Accordion,
  AccordionHeader,
  AccordionBody,
} from "@material-tailwind/react";
import {
  PresentationChartBarIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/solid";
import { ChevronRightIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

export function Sidebar({ selected, setSelected, files, setFiles }) {
  const [open, setOpen] = useState(0);
  const [selectedQueries, setSelectedQueries] = useState([]);


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
        setFiles([]);
      }
    }

    if (selected === null) {
      setSelected(value);
      setFiles([]);
    }
  };

  const handleFileUpload = (e) => {
    const selectedFiles = e.target.files;
    const fileList = [...files, ...selectedFiles];

    setFiles(fileList);
  };

  const handleFileRemove = (removeTargetId) => {
    const dataTransfer = new DataTransfer();

    files.forEach((file) => {
      /* 삭제 대상 아닌 파일들만 dataTransfer에 추가 */
      if (file.lastModified !== removeTargetId) {
        dataTransfer.items.add(file);
      }
    });

    const fileInput = document.querySelector("#file-input");
    fileInput.files = dataTransfer.files;

    /* File List에서 해당 첨부파일 삭제 */
    setFiles(Array.from(dataTransfer.files));
  };

  const handleCheckboxChange = (queryNumber) => {
    const updatedQueries = [...selectedQueries];

    if (updatedQueries.includes(queryNumber)) {
      updatedQueries.splice(updatedQueries.indexOf(queryNumber), 1);
    } else {
      updatedQueries.push(queryNumber);
    }

    setSelectedQueries(updatedQueries);
  };


  return (
    <Card className="h-[calc(100vh-0.5rem)] w-full max-w-[16rem] p-4 shadow-xl shadow-blue-gray-900/5">
      <div className="flex items-center p-4 gap-2">
        <img src={Logo} className="logo" alt="logo" />
        <Typography variant="h4" color="blue-gray">
          DBenVis
        </Typography>
      </div>
      <List>
        <Accordion
          open={open === 1}
          icon={
            <ChevronDownIcon
              strokeWidth={2.5}
              className={`mx-auto h-4 w-4 transition-transform ${
                open === 1 ? "rotate-180" : ""
              }`}
            />
          }
        >
          <ListItem className="p-0" selected={open === 1}>
            <AccordionHeader
              onClick={() => handleOpen(1)}
              className="border-b-0 p-3"
            >
              <ListItemPrefix>
                <PresentationChartBarIcon className="h-5 w-5" />
              </ListItemPrefix>
              <Typography color="blue-gray" className="mr-auto font-normal">
                OLAP
              </Typography>
            </AccordionHeader>
          </ListItem>
          <AccordionBody className="py-1">
            <List className="p-0">
              <ListItemButton onClick={() => handleSelect("TPC-H")}>
                <ListItemText primary="TPC-H"/>
                {open ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={open} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                {[...Array(21).keys()].map((queryNumber) => (
                      <ListItem
                        key={queryNumber + 1}
                        secondaryAction={
                          <IconButton edge="end" aria-label="comments">
                            {/* Add the appropriate icon for secondaryAction */}
                          </IconButton>
                        }
                        disablePadding
                      >
                        <ListItemButton
                          role={undefined}
                          onClick={() => handleCheckboxChange(queryNumber + 1)}
                          dense
                        >
                          <ListItemIcon>
                            <Checkbox
                              checked={selectedQueries.includes(queryNumber + 1)}
                              tabIndex={-1}
                              disableRipple
                            />
                          </ListItemIcon>
                          <ListItemText
                            id={queryNumber + 1}
                            primary={`Query ${queryNumber + 1}`}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                </List>
              </Collapse>
            </List>
          </AccordionBody>
        </Accordion>
        <Accordion
          open={open === 2}
          icon={
            <ChevronDownIcon
              strokeWidth={2.5}
              className={`mx-auto h-4 w-4 transition-transform ${
                open === 2 ? "rotate-180" : ""
              }`}
            />
          }
        >
          <ListItem className="p-0" selected={open === 2}>
            <AccordionHeader
              onClick={() => handleOpen(2)}
              className="border-b-0 p-3"
            >
              <ListItemPrefix>
                <ArrowsRightLeftIcon className="h-5 w-5" />
              </ListItemPrefix>
              <Typography color="blue-gray" className="mr-auto font-normal">
                OLTP
              </Typography>
            </AccordionHeader>
          </ListItem>
          <AccordionBody className="py-1">
            <List className="p-0">
              <ListItem onClick={() => handleSelect("sysbench")}>
                <ListItemPrefix>
                  <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                </ListItemPrefix>
                sysbench
              </ListItem>
            </List>
          </AccordionBody>
        </Accordion>
        <hr className="my-2 border-blue-gray-50" />
        {/* 파일 업로드 */}
        <Typography variant="small" className="font-semibold pb-1">
          Upload Results
        </Typography>
        <label htmlFor="attachment">
          <input
            type="file"
            id="file-input"
            className="file-input file-input-xs w-full"
            disabled={selected === null}
            onChange={handleFileUpload}
          />
          <ul>
            {files.map((file) => (
              <Typography
                as="li"
                variant="small"
                key={file.lastModified}
                className="pt-2 pl-4"
              >
                {file.name}{" "}
                <button onClick={() => handleFileRemove(file.lastModified)}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 12 12"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1"
                      d="M3 9L9 3M3 3l6 6"
                    />
                  </svg>
                </button>
              </Typography>
            ))}
          </ul>
        </label>
      </List>
    </Card>
  );
}

export default Sidebar;
