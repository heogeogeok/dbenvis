import React, { useEffect, useState } from 'react'
import { BarChart } from '@mui/x-charts/BarChart'

const CompareView = ({ files, ...props }) => {
  const [contents, setContents] = useState([])
  const [queryTimes, setQueryTimes] = useState([])
  const [selectedQuery, setSelectedQuery] = useState({})
  const [xAxisData, setXAxisData] = useState([]);
  const [seriesData, setSeriesData] = useState([]);
  const [fileNames, setFileNames] = useState([]);


  /* 데이터 파싱 */
  const parseQueryTimes = fileContents => {
    const regex = /Query (\d+) \*\*[\s\S]+?Time: (\d+\.\d+) ms/g
    const queryTimes = []
    let match

    while ((match = regex.exec(fileContents)) !== null) {
      const queryNumber = match[1]
      const timeInSeconds = parseFloat(match[2]) / 1000
      queryTimes.push({ queryNumber, timeInSeconds })
    }

    return queryTimes
  }
  
  const handleClick = (d, i) => {
    // setSelectedQuery(queryTimes[i])
    console.log('Query number: ' + selectedQuery.queryNumber)
  }

  useEffect(() => {
    if (files && files.length > 0) {
      const fileContents = []

      /* Create a FileReader for each file */
      files.forEach(file => {
        const fileReader = new FileReader()

        fileReader.onload = () => {
          fileContents.push(fileReader.result)
          setContents(fileContents)
        }

        /* Read the file as text */
        fileReader.readAsText(file)
      })
      // Set contents after reading all files
      setContents(fileContents);
    }
  }, [files])

  useEffect(() => {
    const extractedQueryTimes = parseQueryTimes(contents)
    setQueryTimes(extractedQueryTimes)
  }, [contents])

  useEffect(() => {
    // Extract query numbers and times from the data array
    const queryNumbers = queryTimes.map(entry => entry.queryNumber)
    const newFileNames = contents.map((_, index) => `File ${index + 1}`);
    const groupedData = [];


    contents.forEach((file, fileIndex) => {
      const fileData = parseQueryTimes(file);
      fileData.forEach((entry) => {
        const groupIndex = entry.queryNumber - 1; // Adjust to 0-based index
        if (!groupedData[groupIndex]) {
          groupedData[groupIndex] = { queryNumber: entry.queryNumber };
        }
        groupedData[groupIndex][fileNames[fileIndex]] = entry.timeInSeconds;
      });
    });

    const newXAxisData = Array.from({ length: 21 }, (_, i) => i + 1);
    const newSeriesData = fileNames.map((fileName, fileIndex) =>
      queryNumbers.map((queryNumber) => groupedData[queryNumber - 1][fileName])
    );


    setXAxisData(newXAxisData);
    setFileNames(newFileNames);
    setSeriesData(newSeriesData);

  }, [queryTimes, contents, fileNames])

  return (
    <div>
      <BarChart
        xAxis={[{ scaleType: 'band', data: ['group A', 'group B', 'group C'] }]}
        series={[{ data: [4, 3, 5] }, { data: [1, 6, 3] }, { data: [2, 5, 6] }]}
        width={500}
        height={300}
      />
      <BarChart
        xAxis={[{ scaleType: 'band', data: xAxisData }]}
        series={seriesData.map((data, fileIndex) => ({ data, label: fileNames[fileIndex] }))}
        width={500}
        height={300}
        onClick={handleClick}
      />
    </div>
  )
}

export default CompareView
