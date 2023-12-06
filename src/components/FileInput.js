import { useState } from "react";
import "../assets/stylesheets/FileInput.css";

function FileInput(props) {
  const { inputType, selected, files, setFiles } = props;

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameFileId, setRenameFileId] = useState(null);

  const handleFileUpload = (e) => {
    const newFile = e.target.files;

    // 중복 여부 확인
    const exists = files.some(
      (file) => file?.lastModified === newFile[0]?.lastModified
    );

    if (!exists) {
      const fileList = [...files, ...newFile];
      setFiles(fileList);
    }
  };

  const handleFileRemove = (removeTargetId) => {
    const dataTransfer = new DataTransfer();

    files.forEach((file) => {
      // 삭제 대상 아닌 파일들만 dataTransfer에 추가
      if (file.lastModified !== removeTargetId) {
        dataTransfer.items.add(file);
      }
    });

    const fileInput = document.querySelector("#file-input");
    fileInput.files = dataTransfer.files;

    // File List에서 해당 파일 삭제
    setFiles(Array.from(dataTransfer.files));
  };

  const handleRenameClick = (renameTargetId) => {
    setIsRenaming(true);
    setRenameFileId(renameTargetId);

    const targetFile = files.find(
      (file) => file.lastModified === renameTargetId
    );
    setRenameValue(targetFile ? targetFile.name : "");
  };

  const handleRenameChange = (e) => {
    setRenameValue(e.target.value);
  };

  const handleRenameSubmit = () => {
    const dataTransfer = new DataTransfer();

    files.forEach((file) => {
      if (file.lastModified === renameFileId) {
        // rename해서 추가
        const renamedFile = new File([file], renameValue, { type: file.type });
        dataTransfer.items.add(renamedFile);
      } else {
        // 기존 파일은 그대로 추가
        dataTransfer.items.add(file);
      }
    });

    const fileInput = document.querySelector("#file-input");
    fileInput.files = dataTransfer.files;

    setFiles(Array.from(dataTransfer.files));

    setIsRenaming(false);
  };

  const handleRenameCancel = () => {
    setIsRenaming(false);
    setRenameValue("");
    setRenameFileId(null);
  };

  return (
    <div>
      <p className="upload-text">{inputType}</p>
      <label htmlFor="attachment">
        <div className="py-1">
          <input
            type="file"
            id="file-input"
            className="file-input file-input-xs w-11/12"
            disabled={selected === null}
            onChange={handleFileUpload}
          />
        </div>
        <ul>
          {files.map((file) => (
            <li key={file.lastModified} className="file-list">
              {isRenaming && renameFileId === file.lastModified ? (
                <>
                  <input
                    type="text"
                    className="file-name"
                    value={renameValue}
                    onChange={handleRenameChange}
                  />
                  <button onClick={handleRenameSubmit} className="rename-text">
                    Save
                  </button>
                  <button onClick={handleRenameCancel} className="rename-text">
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <p className="file-name">{file.name}</p>
                  <button
                    onClick={() => handleRenameClick(file.lastModified)}
                    className="rename-text"
                  >
                    Rename
                  </button>
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
                </>
              )}
            </li>
          ))}
        </ul>
      </label>
    </div>
  );
}

export default FileInput;
