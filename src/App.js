import { Routes, Route } from "react-router-dom";
import MainPage from "./components/MainPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
    </Routes>
  );
}

export default App;
