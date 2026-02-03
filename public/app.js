let currentFilter = "filtered";
let intervalId = null;
let previousData = [];
let logHistory = [];

function setFilter(type) {
  currentFilter = type;
  loadData();
  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(loadData, 1000 * 10);
}

function clearLog() {
  logHistory = [];
  document.getElementById("log-container").innerHTML =
    "<span style='color:#888;'>로그가 초기화되었습니다.</span>";
}

async function loadData() {
  let result;
  if (currentFilter === "all") {
    result = await window.api.getAll();
  } else if (currentFilter === "gyoyang") {
    result = await window.api.getAllGyoyang();
  } else if (currentFilter === "filtered") {
    result = await window.api.getEnable();
  } else if (currentFilter === "cse") {
    result = await window.api.getCse();
  }
  const container = document.getElementById("table-container");
  const timeDiv = document.getElementById("refresh-time");
  const logDiv = document.getElementById("log-container");
  if (!result || !result.data || !result.data.length) {
    container.innerHTML =
      '<p style="text-align:center; color:#888;">데이터가 없습니다.</p>';
    timeDiv.innerText =
      result && result.time ? `마지막 새로고침: ${result.time}` : "";
    logDiv.innerHTML = "";
    previousData = [];
    return;
  }
  let html = "<table><thead><tr>";
  const keys = Object.keys(result.data[0]);
  for (const key of keys) {
    html += `<th>${key}</th>`;
  }
  html += "</tr></thead><tbody>";
  for (const row of result.data) {
    html += "<tr>";
    for (const key of keys) {
      html += `<td>${row[key]}</td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table>";
  container.innerHTML = html;
  timeDiv.innerText = `마지막 새로고침: ${result.time}`;

  const getKey = (row) =>
    `${row["강좌번호"]}|${row["강좌명"]}|${row["교수명"]}`;
  const getFullKey = (row) =>
    `${row["강좌번호"]}|${row["강좌명"]}|${row["교수명"]}|${row["신청인원"]}`;
  const prevMap = new Map(previousData.map((row) => [getKey(row), row]));
  const currMap = new Map(result.data.map((row) => [getKey(row), row]));
  // 새로 생긴 과목(기존에 없던 key)
  const added = result.data.filter((row) => !prevMap.has(getKey(row)));
  // 없어진 과목(현재에 없는 key)
  const removed = previousData.filter((row) => !currMap.has(getKey(row)));
  // 신청인원 변동(키는 같으나 신청인원 다름)
  const changed = result.data.filter((row) => {
    const prev = prevMap.get(getKey(row));
    return prev && prev["신청인원"] !== row["신청인원"];
  });
  let logHtml = "";
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
  if (added.length > 0) {
    logHtml += `<div style='color:#1976d2;'>[${timeStr}] 새로 생긴 과목:</div><ul style='margin:0 0 8px 12px;'>`;
    for (const row of added) {
      logHtml += `<li>[${row["학부(과)"]}] ${row["강좌명"]} (${row["교수명"]}) [${row["강좌번호"]}]</li>`;
    }
    logHtml += "</ul>";
  }
  if (removed.length > 0) {
    logHtml += `<div style='color:#d32f2f;'>[${timeStr}] 없어진 과목:</div><ul style='margin:0 0 8px 12px;'>`;
    for (const row of removed) {
      logHtml += `<li>[${row["학부(과)"]}] ${row["강좌명"]} (${row["교수명"]}) [${row["강좌번호"]}]</li>`;
    }
    logHtml += "</ul>";
  }
  if (changed.length > 0) {
    logHtml += `<div style='color:#388e3c;'>[${timeStr}] 신청인원 변동:</div><ul style='margin:0 0 8px 12px;'>`;
    for (const row of changed) {
      const prev = prevMap.get(getKey(row));
      logHtml += `<li>[${row["학부(과)"]}] ${row["강좌명"]} (${row["교수명"]}) [${row["강좌번호"]}] <span style='color:#888;'>${prev["신청인원"]} → <b>${row["신청인원"]}</b></span></li>`;
    }
    logHtml += "</ul>";
  }
  if (logHtml) {
    logHistory.push(logHtml);
  }
  if (logHistory.length === 0) {
    logDiv.innerHTML = "<span style='color:#888;'>변동 없음</span>";
  } else {
    logDiv.innerHTML = logHistory
      .slice(-100)
      .reverse()
      .join(
        '<hr style="border:none;border-top:1px dashed #ccc;margin:8px 0;">',
      );
  }
  previousData = result.data;
}

setFilter("all");
