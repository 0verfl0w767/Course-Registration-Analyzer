const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { xml2json } = require("xml-js");
const config = require("./config");

const AREA_MAP = {
  "03": "사회과학영역",
  "04": "자연과학영역",
  "07": "일반선택영역",
  12: "인성영역",
  13: "기초영역",
  15: "인문예술영역",
};

function getStatus(limit, sugang) {
  const limitNum = +limit;
  const sugangNum = +sugang;
  if (limitNum < sugangNum) return "이상 감지";
  if (limitNum === sugangNum) return "신청 불가";
  return "신청 가능";
}

async function getResponseAndConvert() {
  const requestXML = fs.readFileSync(
    path.join(__dirname, config.api.requestXmlPath),
    "utf-8",
  );

  const response = await fetch(config.api.url, {
    method: "POST",
    body: requestXML,
    headers: config.api.headers,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || `HTTP error ${response.status}`);
  }

  const rawXML = await response.text();
  const rawJSON = xml2json(rawXML);
  const responseObj = JSON.parse(rawJSON);
  let infos = [];

  try {
    for (let element of responseObj["elements"] || []) {
      for (let elemen of element["elements"] || []) {
        for (let eleme of elemen["elements"] || []) {
          let info = {};
          let lectnum = 0;
          let area = "";
          let department = "";
          let lecture = "";
          let professor = "";
          let limit = 0;
          let sugang = 0;
          let notice = 0;
          for (let elem of eleme["elements"] || []) {
            if (elem["name"] == "LECT_NO")
              lectnum = elem["attributes"]["value"];
            if (elem["name"] == "CTNCCH_FLD_DIV_CD")
              area = elem["attributes"]["value"];
            if (elem["name"] == "FCLT_NM")
              department = elem["attributes"]["value"];
            if (elem["name"] == "SBJT_NM")
              lecture = elem["attributes"]["value"];
            if (elem["name"] == "STF_NM")
              professor = elem["attributes"]["value"];
            if (elem["name"] == "LIMIT_CNT")
              limit = elem["attributes"]["value"];
            if (elem["name"] == "ALLS_PRNS")
              sugang = elem["attributes"]["value"];
            if (elem["name"] == "NOTI_CTNT")
              notice = elem["attributes"]["value"];
          }
          info = {
            강좌번호: lectnum,
            영역구분: AREA_MAP[area] || area,
            "학부(과)": department,
            강좌명: lecture,
            교수명: professor,
            제한인원: limit,
            신청인원: sugang,
            공지: notice,
            상태: getStatus(limit, sugang),
          };
          if (Object.keys(info).length !== 0) infos.push(info);
        }
      }
    }
  } catch (e) {
    infos = [];
  }
  return infos;
}

function createWindow() {
  const win = new BrowserWindow({
    width: config.window.width,
    height: config.window.height,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  win.loadFile("index.html");
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

function getTimestamp() {
  const now = new Date();
  const dateString =
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(now.getDate()).padStart(2, "0");
  const timeString =
    String(now.getHours()).padStart(2, "0") +
    ":" +
    String(now.getMinutes()).padStart(2, "0") +
    ":" +
    String(now.getSeconds()).padStart(2, "0");
  return dateString + " " + timeString;
}

// 1. 전체 데이터 반환 (모든 학부)
ipcMain.handle("get-all", async () => {
  try {
    const allData = await getResponseAndConvert();
    const result = { time: getTimestamp(), data: allData };
    try {
      fs.writeFileSync(
        path.join(__dirname, "all-data.json"),
        JSON.stringify(result, null, 2),
        "utf-8",
      );
    } catch (err) {}
    return result;
  } catch (e) {
    return [];
  }
});

// 2. 공통(교양)만 반환
ipcMain.handle("get-all-gyoyang", async () => {
  try {
    const allData = await getResponseAndConvert();
    const filtered = (allData || []).filter(
      (item) => item["학부(과)"] === "공통(교양)",
    );
    const result = { time: getTimestamp(), data: filtered };
    return result;
  } catch (e) {
    return [];
  }
});

// 3. 신청 가능 과목 반환 (공통(교양) + 컴퓨터공학부)
ipcMain.handle("get-enable", async () => {
  try {
    const allData = await getResponseAndConvert();
    const filtered = (allData || []).filter((item) => {
      const limit = parseInt(item["제한인원"], 10);
      const sugang = parseInt(item["신청인원"], 10);
      return (
        (item["학부(과)"] === "공통(교양)" ||
          item["학부(과)"] === "컴퓨터공학부") &&
        item["상태"] === "신청 가능" &&
        limit - config.filters.enableMargin == sugang
      );
    });
    const result = { time: getTimestamp(), data: filtered };
    return result;
  } catch (e) {
    return [];
  }
});

// 4. 컴퓨터공학부 과목 반환
ipcMain.handle("get-cse", async () => {
  try {
    const allData = await getResponseAndConvert();
    const filtered = (allData || []).filter(
      (item) => item["학부(과)"] === "컴퓨터공학부",
    );
    const result = { time: getTimestamp(), data: filtered };
    return result;
  } catch (e) {
    return [];
  }
});
