const CONFIG = {
  SHEET_URL: "{{SHEET_PUBLIC_URL}}", // published CSV or JSON
  REQUEST_THRESHOLD: 3,
  POLL_MS: 60000, // 60s
  SUBJECTS: ["Math", "Reading", "Science"],
  PERIODS: [1,2,3,4,5,6,7,8]
};

const boardEl = document.getElementById("tutoring-board");
const lastUpdatedEl = document.getElementById("lastUpdated");
const errorBox = document.getElementById("errorBox");
const refreshBtn = document.getElementById("refreshBtn");

refreshBtn.addEventListener("click", loadData);

let pollInterval = null;
init();

function init() {
  loadData();
  if (CONFIG.POLL_MS > 0) {
    pollInterval = setInterval(loadData, CONFIG.POLL_MS);
  }
}

async function loadData() {
  try {
    errorBox.style.display = "none";
    boardEl.innerHTML = "Loading…";

    const url = CONFIG.SHEET_URL + "?t=" + Date.now();
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Network response " + resp.status);
    const text = await resp.text();

    const rows = parseCSV(text);
    renderBoard(rows);

    lastUpdatedEl.textContent = "Last updated: " + new Date().toLocaleTimeString();
  } catch (err) {
    boardEl.innerHTML = "";
    errorBox.style.display = "block";
    errorBox.textContent = "⚠️ Error loading data. Please try again. (" + err.message + ")";
  }
}

function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines.shift().split(",").map(h => h.trim().toLowerCase());

  return lines.map(line => {
    const cols = line.split(",");
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = cols[i] ? cols[i].trim() : "";
    });
    obj.period = parseInt(obj.period, 10);
    obj.request_count = parseInt(obj.request_count || "0", 10);
    obj.tutor_available = (obj.tutor_available || "NO").toUpperCase();
    return obj;
  });
}

function renderBoard(rows) {
  const dataMap = {};
  CONFIG.SUBJECTS.forEach(subj => {
    dataMap[subj] = {};
    CONFIG.PERIODS.forEach(p => {
      dataMap[subj][p] = {count:0, available:"NO"};
    });
  });

  rows.forEach(r => {
    if (CONFIG.SUBJECTS.includes(r.subject) && CONFIG.PERIODS.includes(r.period)) {
      dataMap[r.subject][r.period] = {
        count: r.request_count,
        available: r.tutor_available
      };
    }
  });

  let html = `<table class="board-table"><thead><tr><th>Subject</th>`;
  CONFIG.PERIODS.forEach(p => html += `<th>Period ${p}</th>`);
  html += `</tr></thead><tbody>`;

  CONFIG.SUBJECTS.forEach(subj => {
    html += `<tr><td>${subj}</td>`;
    CONFIG.PERIODS.forEach(p => {
      const cell = dataMap[subj][p];
      let status = "";
      let cls = "waiting";
      if (cell.available === "YES") {
        status = "✅ Tutor Available";
        cls = "available";
      } else if (cell.count >= CONFIG.REQUEST_THRESHOLD) {
        status = "🔔 Needs Tutor";
        cls = "needs-tutor";
      } else {
        status = "⏳ Waiting";
      }
      html += `<td class="${cls}">
        <div>Requests: ${cell.count}</div>
        <div>${status}</div>
      </td>`;
    });
    html += `</tr>`;
  });

  html += `</tbody></table>`;
  boardEl.innerHTML = html;
}
