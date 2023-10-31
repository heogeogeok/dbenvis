import { Routes, Route } from "react-router-dom";
import MainPage from "./components/MainPage";

function App() {
  const mainWidth = 200;
  const subWidth = 150;
  const margin = 20;
  const radius = 1.5;
  const barPadding = 0.3;

  const parseQueryTimes = (fileContents) => { 
    const regex =/Query (\d+) \*\*[\s\S]+?Time: (\d+\.\d+) ms/g;
    const queryTimes = [];
    let match=regex.exec(fileContents);

    console.log(fileContents);

    while ((match = regex.exec(fileContents)) !== null) {
      const queryNumber = match[1];
      const timeInSeconds = parseFloat(match[2]) / 1000;
      queryTimes.push({ queryNumber, timeInSeconds });

      console.log("test");

    }

    return queryTimes;
  };

  const [queryTimes, setQueryTimes] = useState([]);
  useEffect(() => {
    const fetchFileContents = async () => {
      try {
        const response = await fetch('./data/postgres/result');
        if (!response.ok) {
          throw new Error('Failed to retrieve the file content');
        }
        const fileContents = await response.text();
        const extractedQueryTimes = parseQueryTimes(fileContents);
        setQueryTimes(extractedQueryTimes);
      } catch (error) {
        console.error('Error fetching file:', error);
      }
    };
    fetchFileContents();
  }, []);



  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
    </Routes>
  );
}

export default App;
