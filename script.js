const starter = {
  javascript: `// JS Starter\nconsole.log("Hello Chaos!");`,
  python: `# Python Starter\nprint("Hello Chaos!")`,
  cpp: `// C++ Starter\n#include <iostream>\nusing namespace std;\nint main(){ \n\tcout<<"Hello Chaos!"; \n\treturn 0; \n}`,
  java: `// Java Starter\nimport java.util.*;\n\npublic class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello Chaos!");\n  }\n}`
};

const errors = [
  "SyntaxError: Unexpected 'success' near line 42 🤡",
  "RuntimeError: Infinite loop of regret detected. 🔁",
  "Segmentation fault: You blinked too fast. 💥",
  "SyntaxError: 'fun' is not defined. 🧠",
  "MemoryLeakError: Your code is crying. 😭",
  "TypeError: Expected genius, got confusion. 🤷",
  "StackOverflow: Your logic fell down the stairs. 🪜",
  "Warning: You fixed one bug and created three. 🐛",
  "FatalError: Coffee not found ☕"
];

const sarcasm = [
  "Probably running fine. Probably. 😏",
  "Looks okay... if you squint hard enough. 👀",
  "It compiled! That's suspicious. 🤨",
  "Wow, zero errors? Impossible. 😱",
  "Your code runs on pure chaos energy. ⚡",
  "Working as intended... maybe? 🤷",
  "Error: You're too optimistic. 😅"
];

const loadingSarcasm = [
  "Reticulating splines... again.",
  "Rewiring chaos into order.",
  "Summoning compiler spirits.",
  "Polishing the bugs you missed.",
  "Untangling the stack of doom.",
  "Recalibrating sarcasm levels."
];

const langModes = {
  javascript: "ace/mode/javascript",
  python: "ace/mode/python",
  cpp: "ace/mode/c_cpp",
  java: "ace/mode/java"
};

const DEFAULT_TIMER_SECONDS = 15;
const MAX_TIMER_SECONDS = 15 * 60;
let timerDurationSeconds = DEFAULT_TIMER_SECONDS;
let countdown = timerDurationSeconds;
let timer;
const cdEl = document.getElementById("countdown");
const timerControl = document.getElementById("timerControl");
const logEl = document.getElementById("consoleLog");
const outputBox = document.getElementById("outputBox");
const langSelect = document.getElementById("langSelect");
const inputArea = document.getElementById("inputArea");
const modeSelect = document.getElementById("modeSelect");
const runBtn = document.getElementById("runBtn");
const giveUpBtn = document.getElementById("giveUpBtn");
const runInputBtn = document.getElementById("runInputBtn");
const fileMenuBtn = document.getElementById("fileMenuBtn");
const fileMenu = document.getElementById("fileMenu");
const newFileBtn = document.getElementById("newFileBtn");
const openFileBtn = document.getElementById("openFileBtn");
const openFolderBtn = document.getElementById("openFolderBtn");
const saveFileBtn = document.getElementById("saveFileBtn");
const saveAsFileBtn = document.getElementById("saveAsFileBtn");
const fileOpenInput = document.getElementById("fileOpenInput");
const folderOpenInput = document.getElementById("folderOpenInput");
const loadingOverlay = document.getElementById("loadingOverlay");
const loadingText = loadingOverlay
  ? loadingOverlay.querySelector(".loadingText")
  : null;
const loadingCard = loadingOverlay
  ? loadingOverlay.querySelector(".loadingCard")
  : null;
const loadingTitle = loadingOverlay
  ? loadingOverlay.querySelector(".loadingTitle")
  : null;
const loadingBarFill = document.getElementById("loadingBarFill");

window.__setInputPrompt = (text) => {
  setInputPrompt(text);
};

const editor = ace.edit("editor");
editor.setTheme("ace/theme/monokai");
editor.session.setMode(langModes.python);
editor.setValue(starter.python, -1);

let baseCode = starter.python;
let isCorrupted = false;
let suppressChange = false;
let currentMode = "nightmare";
let isSwitchingMode = false;
let pendingRun = null;
let lastInputPrompt = "";
const MISSING_INPUT = "__MISSING_INPUT__";
let inputPrefix = "";
let suppressInputFix = false;
let currentFileHandle = null;
let currentFileName = "";
let currentDirectoryHandle = null;
let loadingProgressTimer = null;
let loadingProgressValue = 0;

function setEditorValue(value) {
  suppressChange = true;
  editor.setValue(value, -1);
  suppressChange = false;
}

function formatTimer(seconds) {
  if (seconds < 60) {
    return String(seconds) + "s";
  }
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return String(minutes) + ":" + String(remaining).padStart(2, "0");
}

function renderTimerIdle() {
  cdEl.textContent = currentMode === "zen" ? "--" : formatTimer(timerDurationSeconds);
}

function parseTimerInput(rawInput) {
  const value = (rawInput || "").trim().toLowerCase();
  if (!value) {
    return null;
  }
  if (/^\d+:\d{1,2}$/.test(value)) {
    const parts = value.split(":");
    const minutes = Number(parts[0]);
    const seconds = Number(parts[1]);
    if (seconds >= 60) {
      return null;
    }
    return minutes * 60 + seconds;
  }
  if (/^\d+\s*m$/.test(value)) {
    return Number(value.replace("m", "").trim()) * 60;
  }
  if (/^\d+\s*s$/.test(value)) {
    return Number(value.replace("s", "").trim());
  }
  if (/^\d+$/.test(value)) {
    return Number(value);
  }
  return null;
}

function configureTimer() {
  const raw = window.prompt(
    "Set timer (seconds 1-900, mm:ss, or Xm / Xs). Max 15:00.",
    String(timerDurationSeconds)
  );
  if (raw === null) {
    return;
  }
  const parsed = parseTimerInput(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_TIMER_SECONDS) {
    log("Invalid timer value. Allowed range is 1s to 15m.");
    return;
  }
  timerDurationSeconds = parsed;
  clearInterval(timer);
  countdown = timerDurationSeconds;
  renderTimerIdle();
  log("Timer set to " + formatTimer(timerDurationSeconds) + ".");
}

function setLanguage(lang) {
  if (!langModes[lang]) {
    return;
  }
  langSelect.value = lang;
  editor.session.setMode(langModes[lang]);
}

function detectLanguageFromFileName(fileName) {
  const lower = (fileName || "").toLowerCase();
  if (lower.endsWith(".py")) {
    return "python";
  }
  if (lower.endsWith(".js") || lower.endsWith(".mjs") || lower.endsWith(".cjs")) {
    return "javascript";
  }
  if (
    lower.endsWith(".cpp") ||
    lower.endsWith(".cc") ||
    lower.endsWith(".cxx") ||
    lower.endsWith(".c") ||
    lower.endsWith(".hpp") ||
    lower.endsWith(".h")
  ) {
    return "cpp";
  }
  if (lower.endsWith(".java")) {
    return "java";
  }
  return "";
}

function extensionForLanguage(lang) {
  if (lang === "python") {
    return "py";
  }
  if (lang === "javascript") {
    return "js";
  }
  if (lang === "cpp") {
    return "cpp";
  }
  if (lang === "java") {
    return "java";
  }
  return "txt";
}

function defaultFileNameForLanguage(lang) {
  if (lang === "java") {
    return "Main.java";
  }
  return "main." + extensionForLanguage(lang);
}

function log(msg) {
  if (logEl.textContent.length > 0) {
    logEl.textContent += "\n";
  }
  logEl.textContent += msg;
  logEl.scrollTop = logEl.scrollHeight;
}

function setOutputPlaceholder() {
  outputBox.textContent = "Nothing yet. Try running or giving up 😈";
}

function setInputPrompt(text) {
  if (!inputArea) {
    return;
  }
  const fallback = "Program input, one line per value...";
  let nextPrefix = text && text.trim() !== "" ? text : "";
  if (nextPrefix && !/\s$/.test(nextPrefix)) {
    nextPrefix += " ";
  }
  if (!nextPrefix) {
    if (inputPrefix && inputArea.value.startsWith(inputPrefix)) {
      inputArea.value = inputArea.value.slice(inputPrefix.length);
    }
    inputPrefix = "";
    inputArea.placeholder = fallback;
    return;
  }

  inputPrefix = nextPrefix;
  inputArea.placeholder = fallback;
  inputArea.value = inputPrefix;
  inputArea.setSelectionRange(inputArea.value.length, inputArea.value.length);
}

function updateRunInputState() {
  if (!runInputBtn) {
    return;
  }
  const hasInput = getInputText().trim() !== "";
  runInputBtn.disabled = !pendingRun || !hasInput;
}

function resetInputValue() {
  if (!inputArea) {
    return;
  }
  if (inputPrefix) {
    inputArea.value = inputPrefix;
    inputArea.setSelectionRange(inputArea.value.length, inputArea.value.length);
  } else {
    inputArea.value = "";
  }
  updateRunInputState();
}

function extractPythonPrompt(code) {
  const match = code.match(/input\s*\(\s*(['"`])([^'"`]+)\1/);
  if (match && match[2]) {
    return match[2];
  }
  return "";
}

function extractJavascriptPrompt(code) {
  const promptCall = code.match(/\bprompt\s*\(\s*(['"`])([^'"`]+)\1/);
  if (promptCall && promptCall[2]) {
    return promptCall[2];
  }
  const inlineHint = code.match(/\/\/\s*input\s*:\s*(.+)$/im);
  if (inlineHint && inlineHint[1]) {
    return inlineHint[1].trim();
  }
  return "";
}

function extractCppPrompt(code) {
  const printThenRead = code.match(
    /(?:cout\s*<<\s*["']([^"']+)["'][^;\n]*;[\s\S]{0,200}?(?:cin\s*>>|getline\s*\())/m
  );
  if (printThenRead && printThenRead[1]) {
    return printThenRead[1].trim();
  }
  return "";
}

function extractJavaPrompt(code) {
  const hasJavaInput = /(?:nextInt\s*\(|nextLong\s*\(|nextDouble\s*\(|nextLine\s*\(|System\.in)/.test(code);
  if (!hasJavaInput) {
    return "";
  }
  const printMatch = code.match(/System\.out\.(?:print|println)\s*\(\s*["']([^"']+)["']/);
  if (printMatch && printMatch[1]) {
    return printMatch[1].trim();
  }
  return "";
}

function promptForLanguage(lang, code) {
  if (lang === "python") {
    return extractPythonPrompt(code);
  }
  if (lang === "javascript") {
    return extractJavascriptPrompt(code) || "Enter input:";
  }
  if (lang === "cpp") {
    return extractCppPrompt(code) || "Enter input:";
  }
  if (lang === "java") {
    return extractJavaPrompt(code) || "Enter input:";
  }
  return "Enter input:";
}

function detectInputNeeded(lang, code, inputText) {
  if (inputText.trim() !== "") {
    return false;
  }
  if (lang === "python") {
    return /\binput\s*\(/.test(code);
  }
  if (lang === "javascript") {
    return /\breadline\s*\(/.test(code);
  }
  if (lang === "cpp") {
    return /\bcin\b|getline\s*\(/.test(code);
  }
  if (lang === "java") {
    return /Scanner\s*\(|BufferedReader|System\.in/.test(code);
  }
  return false;
}

function setOutput(message, output, messageClass) {
  outputBox.innerHTML = "";
  if (message) {
    const msgEl = document.createElement("div");
    if (messageClass) {
      msgEl.className = messageClass;
    }
    msgEl.textContent = message;
    outputBox.appendChild(msgEl);
  }
  if (output !== undefined && output !== null && output !== "") {
    const outEl = document.createElement("div");
    outEl.className = "correctOutput";
    outEl.textContent = String(output);
    outputBox.appendChild(outEl);
  }
}

function getInputText() {
  if (!inputArea) {
    return "";
  }
  let value = inputArea.value || "";
  if (inputPrefix && value.startsWith(inputPrefix)) {
    value = value.slice(inputPrefix.length);
  }
  return value.replace(/^\r?\n/, "");
}

function closeFileMenu() {
  if (!fileMenu || !fileMenuBtn) {
    return;
  }
  fileMenu.hidden = true;
  fileMenuBtn.setAttribute("aria-expanded", "false");
}

function openFileMenu() {
  if (!fileMenu || !fileMenuBtn) {
    return;
  }
  fileMenu.hidden = false;
  fileMenuBtn.setAttribute("aria-expanded", "true");
}

function resetRuntimeAfterLoad() {
  clearInterval(timer);
  renderTimerIdle();
  pendingRun = null;
  updateRunInputState();
  setInputPrompt("");
  setOutputPlaceholder();
  isCorrupted = false;
  baseCode = editor.getValue();
}

function loadCodeIntoEditor(code, fileName, fileHandle) {
  const detectedLang = detectLanguageFromFileName(fileName);
  if (detectedLang) {
    setLanguage(detectedLang);
  }
  setEditorValue(code || "");
  currentFileHandle = fileHandle || null;
  currentFileName = fileName || "";
  resetRuntimeAfterLoad();
  log((fileName ? "Opened file: " + fileName : "Loaded code into editor.") );
}

function filePickerTypes() {
  return [
    {
      description: "Code Files",
      accept: {
        "text/plain": [".py", ".js", ".mjs", ".cpp", ".cc", ".cxx", ".c", ".java", ".txt"]
      }
    }
  ];
}

async function openFileAction() {
  try {
    if (window.showOpenFilePicker) {
      const picks = await window.showOpenFilePicker({
        multiple: false,
        types: filePickerTypes()
      });
      if (!picks || !picks.length) {
        return;
      }
      const handle = picks[0];
      const file = await handle.getFile();
      const content = await file.text();
      loadCodeIntoEditor(content, file.name, handle);
      return;
    }

    if (fileOpenInput) {
      fileOpenInput.value = "";
      fileOpenInput.click();
    }
  } catch (error) {
    if (error && error.name !== "AbortError") {
      log("Open file failed: " + String(error));
    }
  }
}

function openFolderFallback() {
  if (!folderOpenInput) {
    log("Open Folder is not supported in this browser.");
    return;
  }
  folderOpenInput.value = "";
  folderOpenInput.click();
}

async function openFolderAction() {
  try {
    if (!window.showDirectoryPicker) {
      openFolderFallback();
      return;
    }
    const dirHandle = await window.showDirectoryPicker();
    currentDirectoryHandle = dirHandle;
    const candidates = [];
    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind !== "file") {
        continue;
      }
      const lower = name.toLowerCase();
      if (!detectLanguageFromFileName(name) && !lower.endsWith(".txt")) {
        continue;
      }
      candidates.push({ name, handle });
    }
    if (!candidates.length) {
      log("No code files found in selected folder.");
      return;
    }
    candidates.sort((a, b) => a.name.localeCompare(b.name));
    const optionsText = candidates
      .map((entry, idx) => String(idx + 1) + ". " + entry.name)
      .join("\n");
    const pick = window.prompt("Open file number:\n" + optionsText, "1");
    if (pick === null) {
      return;
    }
    const index = Number(pick) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= candidates.length) {
      log("Invalid file selection.");
      return;
    }
    const selected = candidates[index];
    const file = await selected.handle.getFile();
    const content = await file.text();
    loadCodeIntoEditor(content, selected.name, selected.handle);
  } catch (error) {
    if (error && error.name !== "AbortError") {
      log("Open folder failed: " + String(error));
    }
  }
}

function downloadTextFile(fileName, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

async function writeToFileHandle(handle, content) {
  if (!handle) {
    return false;
  }
  let permission = "granted";
  if (handle.queryPermission) {
    permission = await handle.queryPermission({ mode: "readwrite" });
  }
  if (permission !== "granted" && handle.requestPermission) {
    permission = await handle.requestPermission({ mode: "readwrite" });
  }
  if (permission !== "granted") {
    log("Save cancelled: write permission denied.");
    return false;
  }
  const writer = await handle.createWritable();
  await writer.write(content);
  await writer.close();
  return true;
}

async function saveAsAction() {
  const code = editor.getValue();
  const lang = langSelect.value;
  const suggestedName = currentFileName || defaultFileNameForLanguage(lang);
  try {
    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: "Code File",
            accept: {
              "text/plain": ["." + extensionForLanguage(lang), ".txt"]
            }
          }
        ]
      });
      const ok = await writeToFileHandle(handle, code);
      if (!ok) {
        return;
      }
      currentFileHandle = handle;
      currentFileName = handle.name || suggestedName;
      log("Saved file.");
      return;
    }

    downloadTextFile(suggestedName, code);
    currentFileName = suggestedName;
    currentFileHandle = null;
    log("Saved file using download.");
  } catch (error) {
    if (error && error.name !== "AbortError") {
      log("Save As failed: " + String(error));
    }
  }
}

async function saveFileAction() {
  const code = editor.getValue();
  if (!currentFileHandle) {
    await saveAsAction();
    return;
  }
  try {
    const ok = await writeToFileHandle(currentFileHandle, code);
    if (!ok) {
      return;
    }
    log("Saved file.");
  } catch (error) {
    log("Save failed: " + String(error));
  }
}

function newFileAction() {
  const lang = langSelect.value;
  currentFileHandle = null;
  currentFileName = "";
  setEditorValue(starter[lang] || "");
  resetRuntimeAfterLoad();
  log("Created new file.");
}

function startTimer() {
  countdown = timerDurationSeconds;
  cdEl.textContent = formatTimer(countdown);
  clearInterval(timer);
  timer = setInterval(() => {
    countdown--;
    cdEl.textContent = formatTimer(Math.max(countdown, 0));
    if (countdown <= 0) {
      clearInterval(timer);
      runCode(true);
    }
  }, 1000);
}

function corruptCode(code) {
  const pos = Math.floor(Math.random() * code.length);
  const insert = ["#", "@", "!", "???", "// oops"][Math.floor(Math.random() * 5)];
  return code.slice(0, pos) + insert + code.slice(pos);
}

function runJavascript(code, inputText) {
  const logs = [];
  const original = {
    log: console.log,
    warn: console.warn,
    error: console.error
  };
  let missingInput = false;
  const jsPrompt = promptForLanguage("javascript", code) || "Enter input:";

  const push = (prefix, args) => {
    const parts = args.map((arg) =>
      typeof arg === "string" ? arg : JSON.stringify(arg)
    );
    logs.push(prefix + parts.join(" "));
  };

  console.log = (...args) => push("", args);
  console.warn = (...args) => push("Warn: ", args);
  console.error = (...args) => push("Error: ", args);

  try {
    const inputLines = inputText.split(/\r?\n/);
    const wrapped =
      "let __inputIndex = 0;\n" +
      "function readline() {\n" +
      "  if (__inputIndex < inputLines.length) {\n" +
      "    return inputLines[__inputIndex++];\n" +
      "  }\n" +
      "  if (window.__setInputPrompt) {\n" +
      "    window.__setInputPrompt(" + JSON.stringify(jsPrompt) + ");\n" +
      "  }\n" +
      "  window.__missingInput = true;\n" +
      "  return \"\";\n" +
      "}\n" +
      code;
    const fn = new Function("inputLines", wrapped);
    window.__missingInput = false;
    const result = fn(inputLines);
    missingInput = window.__missingInput === true;
    if (result !== undefined) {
      logs.push(String(result));
    }
  } catch (e) {
    logs.push(e.toString());
  } finally {
    console.log = original.log;
    console.warn = original.warn;
    console.error = original.error;
  }

  if (missingInput) {
    lastInputPrompt = jsPrompt;
    return MISSING_INPUT;
  }
  return logs.join("\n");
}

function skulptRead(path) {
  if (window.Sk && Sk.builtinFiles && Sk.builtinFiles.files[path]) {
    return Sk.builtinFiles.files[path];
  }
  throw new Error("File not found: " + path);
}

async function runOnServer(language, code, inputText) {
  try {
    const response = await fetch("http://127.0.0.1:5000/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language, code, input: inputText })
    });
    if (!response.ok) {
      return `Server error: ${response.status}`;
    }
    const data = await response.json();
    return (data && data.output) || "";
  } catch (error) {
    console.error("Fetch error:", error);
    return "Error connecting to the compiler server. Is it running?";
  }
}

async function runPython(code, inputText) {
  if (window.Sk) {
    let output = "";
    const inputLines = inputText.split(/\r?\n/);
    let inputIndex = 0;
    let missingInput = false;
    let lastPrompt = "";
    Sk.configure({
      output: (text) => {
        output += text;
      },
      read: skulptRead,
      inputfun: (prompt) => {
        lastPrompt = prompt || lastPrompt;
        if (inputIndex < inputLines.length) {
          return inputLines[inputIndex++];
        }
        missingInput = true;
        return "";
      },
      inputfunTakesPrompt: true
    });
    try {
      await Sk.misceval.asyncToPromise(() =>
        Sk.importMainWithBody("<stdin>", false, code, true)
      );
      if (missingInput) {
        lastInputPrompt = lastPrompt || "";
        return MISSING_INPUT;
      }
      return output.trim();
    } catch (e) {
      if (missingInput) {
        lastInputPrompt = lastPrompt || "";
        return MISSING_INPUT;
      }
      return e.toString();
    }
  }

  return runOnServer("python", code, inputText);
}

async function runByLanguage(lang, code, inputText) {
  if (lang === "javascript") {
    return runJavascript(code, inputText);
  }
  if (lang === "python") {
    return await runPython(code, inputText);
  }
  if (lang === "cpp") {
    return await runOnServer("cpp", code, inputText);
  }
  if (lang === "java") {
    return await runOnServer("java", code, inputText);
  }
  return "Unsupported language.";
}

async function executeWithInput() {
  if (!pendingRun) {
    return;
  }
  const { lang, code, label } = pendingRun;
  const inputText = getInputText();
  if (inputText.trim() === "") {
    setInputPrompt(promptForLanguage(lang, code) || "Enter input:");
    setOutput(
      "Input required:",
      "Enter values below, then click Run With Input.",
      "sarcastic"
    );
    updateRunInputState();
    return;
  }

  pendingRun = null;
  updateRunInputState();
  const output = await runByLanguage(lang, code, inputText);
  if (output === MISSING_INPUT) {
    pendingRun = { lang, code, label };
    const promptText = lastInputPrompt || promptForLanguage(lang, code) || "Enter input:";
    setInputPrompt(promptText);
    setOutput(
      "Input required:",
      "Enter the remaining values below, then click Run With Input.",
      "sarcastic"
    );
    updateRunInputState();
    return;
  }

  const displayOutput = output === "" ? "(no output)" : output;
  if (label === "zen") {
    setOutput("Output:", displayOutput, "correctMsg");
  } else {
    setOutput("Ahhhhhh! I won! Now the output is:", displayOutput, "correctMsg");
  }
  log("✅ Auto-correct executed, showing real output.");
  resetInputValue();
}

async function runCode(auto = false) {
  const lang = langSelect.value;
  const code = editor.getValue();
  const inputText = getInputText();
  pendingRun = null;
  updateRunInputState();

  if (currentMode === "zen") {
    if (detectInputNeeded(lang, code, inputText)) {
      pendingRun = { lang, code, label: "zen" };
      const promptText = promptForLanguage(lang, code);
      setInputPrompt(promptText || "Enter input:");
      setOutput(
        "Input required:",
        "Enter values below, then click Run With Input.",
        "sarcastic"
      );
      updateRunInputState();
      return;
    }
    const output = await runByLanguage(lang, code, inputText);
    if (output === MISSING_INPUT) {
      pendingRun = { lang, code, label: "zen" };
      setInputPrompt(lastInputPrompt || promptForLanguage(lang, code) || "Enter input:");
      setOutput(
        "Input required:",
        "Enter values below, then click Run With Input.",
        "sarcastic"
      );
      updateRunInputState();
      return;
    }
    const displayOutput = output === "" ? "(no output)" : output;
    setOutput("Output:", displayOutput, "correctMsg");
    log("[🏃] Zen mode executed.");
    resetInputValue();
    return;
  }

  if (!auto) {
    const err = errors[Math.floor(Math.random() * errors.length)];
    const sar = sarcasm[Math.floor(Math.random() * sarcasm.length)];
    log("💥 " + err);
    setOutput(sar, "", "sarcastic");
    if (!isCorrupted) {
      baseCode = code;
    }
    setEditorValue(corruptCode(code));
    isCorrupted = true;
    startTimer();
    return;
  }

  setEditorValue(baseCode);
  isCorrupted = false;
  if (detectInputNeeded(lang, baseCode, inputText)) {
    pendingRun = { lang, code: baseCode, label: "nightmare" };
    const promptText = promptForLanguage(lang, baseCode);
    setInputPrompt(promptText || "Enter input:");
    setOutput(
      "Input required:",
      "Enter values below, then click Run With Input.",
      "sarcastic"
    );
    updateRunInputState();
    return;
  }
  const correctOutput = await runByLanguage(lang, baseCode, inputText);
  if (correctOutput === MISSING_INPUT) {
    pendingRun = { lang, code: baseCode, label: "nightmare" };
    setInputPrompt(lastInputPrompt || promptForLanguage(lang, baseCode) || "Enter input:");
    setOutput(
      "Input required:",
      "Enter values below, then click Run With Input.",
      "sarcastic"
    );
    updateRunInputState();
    return;
  }

  const displayOutput =
    correctOutput === "" ? "(no output)" : correctOutput;
  setOutput("Ahhhhhh! I won! Now the output is:", displayOutput, "correctMsg");
  log("✅ Auto-correct executed, showing real output.");
  resetInputValue();
}

runBtn.onclick = () => runCode(false);
giveUpBtn.onclick = () => {
  if (currentMode === "zen") {
    runCode(false);
    return;
  }
  clearInterval(timer);
  runCode(true);
  log("You gave up. Auto-fix reveals itself.");
};

if (runInputBtn) {
  runInputBtn.onclick = () => executeWithInput();
  runInputBtn.disabled = true;
}

if (fileMenuBtn && fileMenu) {
  fileMenuBtn.setAttribute("aria-expanded", "false");
  fileMenuBtn.addEventListener("click", () => {
    if (fileMenu.hidden) {
      openFileMenu();
    } else {
      closeFileMenu();
    }
  });
}

if (newFileBtn) {
  newFileBtn.addEventListener("click", () => {
    closeFileMenu();
    newFileAction();
  });
}

if (openFileBtn) {
  openFileBtn.addEventListener("click", () => {
    closeFileMenu();
    openFileAction();
  });
}

if (openFolderBtn) {
  openFolderBtn.addEventListener("click", () => {
    closeFileMenu();
    openFolderAction();
  });
}

if (saveFileBtn) {
  saveFileBtn.addEventListener("click", () => {
    closeFileMenu();
    saveFileAction();
  });
}

if (saveAsFileBtn) {
  saveAsFileBtn.addEventListener("click", () => {
    closeFileMenu();
    saveAsAction();
  });
}

if (fileOpenInput) {
  fileOpenInput.addEventListener("change", async (event) => {
    const target = event.target;
    const file = target && target.files && target.files[0] ? target.files[0] : null;
    if (!file) {
      return;
    }
    const content = await file.text();
    loadCodeIntoEditor(content, file.name, null);
  });
}

if (folderOpenInput) {
  folderOpenInput.addEventListener("change", async (event) => {
    const target = event.target;
    const files = target && target.files ? Array.from(target.files) : [];
    const candidates = files.filter((file) => {
      const lower = file.name.toLowerCase();
      return detectLanguageFromFileName(file.name) || lower.endsWith(".txt");
    });
    if (!candidates.length) {
      log("No code files found in selected folder.");
      return;
    }
    candidates.sort((a, b) => a.name.localeCompare(b.name));
    const optionsText = candidates
      .map((file, idx) => String(idx + 1) + ". " + (file.webkitRelativePath || file.name))
      .join("\n");
    const pick = window.prompt("Open file number:\n" + optionsText, "1");
    if (pick === null) {
      return;
    }
    const index = Number(pick) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= candidates.length) {
      log("Invalid file selection.");
      return;
    }
    const selected = candidates[index];
    const content = await selected.text();
    loadCodeIntoEditor(content, selected.name, null);
  });
}

document.getElementById("resetBtn").onclick = () => {
  clearInterval(timer);
  const lang = langSelect.value;
  setEditorValue(starter[lang]);
  editor.session.setMode(langModes[lang]);
  baseCode = starter[lang];
  isCorrupted = false;
  if (inputArea) {
    inputArea.value = "";
  }
  setInputPrompt("");
  pendingRun = null;
  updateRunInputState();
  setOutputPlaceholder();
  renderTimerIdle();
  log("Editor reset. Fresh chaos awaits.");
};

langSelect.addEventListener("change", () => {
  clearInterval(timer);
  const lang = langSelect.value;
  editor.session.setMode(langModes[lang]);
  setEditorValue(starter[lang]);
  baseCode = starter[lang];
  isCorrupted = false;
  currentFileHandle = null;
  currentFileName = "";
  if (inputArea) {
    inputArea.value = "";
  }
  setInputPrompt("");
  pendingRun = null;
  updateRunInputState();
  setOutputPlaceholder();
  renderTimerIdle();
  log("Language switched to " + lang.toUpperCase() + ". Prepare for chaos.");
});

editor.session.on("change", () => {
  if (suppressChange) {
    return;
  }
  baseCode = editor.getValue();
  isCorrupted = false;
});

if (inputArea) {
  inputArea.addEventListener("keydown", (event) => {
    if (!inputPrefix) {
      return;
    }
    const start = inputArea.selectionStart;
    const end = inputArea.selectionEnd;
    if (event.key === "Backspace" && start <= inputPrefix.length && end <= inputPrefix.length) {
      event.preventDefault();
    }
    if (event.key === "Delete" && start < inputPrefix.length) {
      event.preventDefault();
    }
  });
  inputArea.addEventListener("input", () => {
    if (suppressInputFix) {
      return;
    }
    if (inputPrefix && !inputArea.value.startsWith(inputPrefix)) {
      suppressInputFix = true;
      const cleaned = inputArea.value.replace(/^\s+/, "");
      inputArea.value = inputPrefix + cleaned;
      inputArea.setSelectionRange(inputArea.value.length, inputArea.value.length);
      suppressInputFix = false;
    }
    updateRunInputState();
  });
}

document.addEventListener("click", (event) => {
  if (!fileMenu || !fileMenuBtn || fileMenu.hidden) {
    return;
  }
  const target = event.target;
  if (fileMenu.contains(target) || fileMenuBtn.contains(target)) {
    return;
  }
  closeFileMenu();
});

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key === "escape") {
    closeFileMenu();
    return;
  }

  const mod = event.ctrlKey || event.metaKey;
  if (!mod) {
    return;
  }

  if (key === "n") {
    event.preventDefault();
    closeFileMenu();
    newFileAction();
    return;
  }
  if (key === "o" && event.shiftKey) {
    event.preventDefault();
    closeFileMenu();
    openFolderAction();
    return;
  }
  if (key === "o") {
    event.preventDefault();
    closeFileMenu();
    openFileAction();
    return;
  }
  if (key === "s" && event.shiftKey) {
    event.preventDefault();
    closeFileMenu();
    saveAsAction();
    return;
  }
  if (key === "s") {
    event.preventDefault();
    closeFileMenu();
    saveFileAction();
  }
});

function applyMode(mode) {
  currentMode = mode;
  if (currentMode === "zen") {
    clearInterval(timer);
    giveUpBtn.disabled = true;
    renderTimerIdle();
    log("🧘 Mode switched to ZEN. Chaos disabled.");
    return;
  }
  giveUpBtn.disabled = false;
  renderTimerIdle();
  log("🐛 Mode switched to NIGHTMARE. Prepare for chaos.");
}

function setLoadingProgress(value) {
  if (!loadingBarFill) {
    return;
  }
  loadingBarFill.style.width = String(Math.max(0, Math.min(100, value))) + "%";
}

function startLoadingProgress() {
  clearInterval(loadingProgressTimer);
  loadingProgressValue = 7;
  setLoadingProgress(loadingProgressValue);
  loadingProgressTimer = setInterval(() => {
    loadingProgressValue = Math.min(94, loadingProgressValue + Math.floor(Math.random() * 9 + 3));
    setLoadingProgress(loadingProgressValue);
    if (loadingProgressValue >= 94) {
      clearInterval(loadingProgressTimer);
      loadingProgressTimer = null;
    }
  }, 120);
}

function finishLoadingProgress() {
  clearInterval(loadingProgressTimer);
  loadingProgressTimer = null;
  loadingProgressValue = 100;
  setLoadingProgress(loadingProgressValue);
}

function setLoadingVariant(variant) {
  if (!loadingCard) {
    return;
  }
  loadingCard.classList.toggle("classicCard", variant === "classic");
}

function showLoading(message, title, variant) {
  if (!loadingOverlay || !loadingText) {
    return;
  }
  const chosen = variant || "haunted";
  setLoadingVariant(chosen);
  if (loadingTitle) {
    loadingTitle.textContent = title || "Booting Haunted IDE";
  }
  loadingText.textContent = message;
  if (chosen === "classic") {
    clearInterval(loadingProgressTimer);
    loadingProgressTimer = null;
    setLoadingProgress(0);
  } else {
    startLoadingProgress();
  }
  loadingOverlay.classList.add("show");
  loadingOverlay.setAttribute("aria-hidden", "false");
}

async function hideLoading() {
  if (!loadingOverlay) {
    return;
  }
  if (loadingCard && !loadingCard.classList.contains("classicCard")) {
    finishLoadingProgress();
  }
  await new Promise((resolve) => setTimeout(resolve, 180));
  loadingOverlay.classList.remove("show");
  loadingOverlay.setAttribute("aria-hidden", "true");
}

async function switchModeWithLoading(nextMode) {
  if (isSwitchingMode || nextMode === currentMode) {
    return;
  }
  isSwitchingMode = true;
  if (modeSelect) {
    modeSelect.disabled = true;
  }
  const message =
    loadingSarcasm[Math.floor(Math.random() * loadingSarcasm.length)];
  showLoading(message, "Switching Runtime Mood", "classic");
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await hideLoading();
  applyMode(nextMode);
  if (modeSelect) {
    modeSelect.disabled = false;
  }
  isSwitchingMode = false;
}

if (modeSelect) {
  modeSelect.value = "nightmare";
  modeSelect.addEventListener("change", () => {
    switchModeWithLoading(modeSelect.value);
  });
}

if (timerControl) {
  timerControl.addEventListener("click", () => {
    configureTimer();
  });
}

if (loadingOverlay) {
  loadingOverlay.addEventListener("pointermove", (event) => {
    const rect = loadingOverlay.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    loadingOverlay.style.setProperty("--mx", String(x.toFixed(3)));
    loadingOverlay.style.setProperty("--my", String(y.toFixed(3)));
  });
  loadingOverlay.addEventListener("pointerleave", () => {
    loadingOverlay.style.setProperty("--mx", "0");
    loadingOverlay.style.setProperty("--my", "0");
  });
}

async function bootIde() {
  if (loadingOverlay) {
    loadingOverlay.classList.remove("show");
    loadingOverlay.setAttribute("aria-hidden", "true");
  }
  applyMode("nightmare");
  log("Language switched to PYTHON. Prepare for chaos.");
}

bootIde();
