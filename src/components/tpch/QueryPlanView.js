import { useEffect, useState } from "react";

function QueryPlanView({ files }) {
  const [contents, setContents] = useState([]);
  

  useEffect(() => {
    if (files && files.length > 0) {
      const fileContents = [];

      /* Create a FileReader for each file */
      files.forEach((file) => {
        const fileReader = new FileReader();

        fileReader.onload = () => {
          fileContents.push(fileReader.result);
          setContents(fileContents);
        };

        /* Read the file as text */
        fileReader.readAsText(file);
      });
    }
  }, [files]);

  return (
    <div>
      <h1>Query Plan View</h1>
    </div>
  );
}

export default QueryPlanView;
