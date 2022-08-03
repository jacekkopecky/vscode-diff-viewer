(function () {
  const vscode = acquireVsCodeApi();

  // only expecting an update message
  window.addEventListener("message", async (e) => {
    const { config, diffFiles, destination, viewedFiles } = e.data;

    const targetElement = document.getElementById(destination);
    targetElement.textContent = "";

    const diff2htmlUi = new Diff2HtmlUI(targetElement, diffFiles, config);
    diff2htmlUi.draw();

    toggleViewedFiles(targetElement, viewedFiles);
    registerViewToggleHandlers(targetElement);
    registerFileOpeningHandlers(targetElement);
    updateFooter();
  });

  function toggleViewedFiles(root, viewedFiles) {
    const viewedToggles = root.querySelectorAll(".d2h-file-collapse-input");
    for (let i = 0; i < viewedToggles.length; i += 1) {
      if (viewedFiles[i]) viewedToggles[i].click();
    }
  }

  function registerViewToggleHandlers(root) {
    const viewedToggles = root.querySelectorAll(".d2h-file-collapse-input");
    for (const el of viewedToggles) {
      el.addEventListener("change", scrollHeaderIntoView);
      el.addEventListener("change", reportViewedToggle);
    }

    function reportViewedToggle(e) {
      updateFooter();
      const allToggles = root.querySelectorAll(".d2h-file-collapse-input");
      const indexOfTarget = Array.from(allToggles).indexOf(e.target);
      if (indexOfTarget !== -1) {
        sendFileViewedMessage(indexOfTarget, e.target.checked);
      }
    }
  }

  function sendFileViewedMessage(index, value) {
    vscode.postMessage({
      command: "reportFileViewed",
      index,
      viewed: value,
    });
  }

  function sendOpenFileMessage(path, line) {
    vscode.postMessage({
      command: "openFile",
      path,
      line,
    });
  }

  function scrollHeaderIntoView(e) {
    const headerEl = e.target.closest(".d2h-file-header");
    if (headerEl) {
      headerEl.scrollIntoView({ block: "nearest" });
    }
  }

  function updateFooter() {
    const footer = document.querySelector("footer");
    if (footer) {
      const allCount = document.querySelectorAll(".d2h-file-collapse-input").length;
      const viewedCount = document.querySelectorAll(".d2h-file-collapse-input:checked").length;
      footer.textContent = `viewed ${viewedCount}/${allCount}`;
    }
  }

  function registerFileOpeningHandlers(root) {
    root.addEventListener("click", handleLineClick);
    root.addEventListener("click", handleFileNameClick);
  }

  function handleLineClick(e) {
    const lineNo = getClickedLineNumber(e.target);

    // stop if we have not clicked on a line number
    if (lineNo == null) return;

    const fileName = getClickedFileName(e.target);

    console.log(`clicked ${fileName}:${lineNo}`);
    sendOpenFileMessage(fileName, lineNo);
  }

  function getClickedLineNumber(target) {
    const lineNoEl = target.closest(".d2h-code-linenumber") ?? target.closest(".d2h-code-side-linenumber");

    // the click is not on a line number
    if (!lineNoEl) return;

    if (lineNoEl.matches(".d2h-code-side-linenumber")) {
      // side-by-side view

      // not clickable: in side-by-side on the left-hand side
      if (lineNoEl.closest(".d2h-file-side-diff:first-child")) return;

      return stringToNumber(lineNoEl.textContent);
    } else {
      // line-by-line view

      // not clickable: deletion or info lines
      if (lineNoEl.matches(".d2h-del") || lineNoEl.matches(".d2h-info")) return;

      return stringToNumber(lineNoEl.querySelector(".line-num2")?.textContent);
    }
  }

  function getClickedFileName(target) {
    const nameText = target.closest(".d2h-file-wrapper")?.querySelector(".d2h-file-name")?.textContent;
    if (!nameText) return;

    // handle special case when the file has moved
    // e.g. "{src → lib}/file.js"  or  "src/{oldName.js → new-name.js}"
    const withoutMoves = nameText.replaceAll(/\{\S+ → (\S+)\}/gu, "$1");
    return withoutMoves;
  }

  function stringToNumber(str) {
    const num = Number.parseInt(str?.trim?.());
    return Number.isNaN(num) ? undefined : num;
  }

  function handleFileNameClick(e) {
    if (e.target.closest(".d2h-file-name")) {
      const fileName = getClickedFileName(e.target);
      console.log(`clicked ${fileName} without line`);
      // we have actually clicked on a file name
      sendOpenFileMessage(fileName);
    }
  }
})();
