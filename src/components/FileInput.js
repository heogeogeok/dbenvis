import "../assets/stylesheets/FileInput.css";

function FileInput({ selected, files, setFiles }) {
  const handleFileUpload = (e) => {
    const newFile = e.target.files;
    const fileList = [...files, ...newFile];

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

  return (
    <div>
      <p className="upload-text">Upload Results</p>
      <label htmlFor="attachment">
        <div className="py-1">
          <input
            type="file"
            id="file-input"
            className="file-input file-input-xs w-48"
            disabled={selected === null}
            onChange={handleFileUpload}
          />
        </div>
        <ul>
          {files.map((file) => (
            <div className="file-list">
              <p className="file-name">{file.name} </p>
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
            </div>
          ))}
        </ul>
      </label>
    </div>
  );
}

export default FileInput;
