console.log('Teachers array:', teachers);

const searchInput = document.getElementById('teacherSearch');
const suggestionsList = document.getElementById('suggestions');
const teacherInfo = document.getElementById('teacherInfo');

searchInput.addEventListener('input', function () {
  const query = this.value.toLowerCase();
  suggestionsList.innerHTML = '';

  if (query.length < 2) {
    suggestionsList.style.display = 'none';
    return;
  }

  const matches = teachers.filter(t =>
    t.name.toLowerCase().includes(query)
  );

  matches.forEach(teacher => {
    const li = document.createElement('li');
    li.textContent = teacher.name;
    li.addEventListener('click', () => {
      displayTeacherInfo(teacher);
      suggestionsList.style.display = 'none';
      searchInput.value = teacher.name;
    });
    suggestionsList.appendChild(li);
  });

  suggestionsList.style.display = matches.length ? 'block' : 'none';
});

function displayTeacherInfo(teacher) {
  const sortedSchedule = teacher.schedule.sort((a, b) => a.period - b.period);

  teacherInfo.innerHTML =
    `<h2>${teacher.name}</h2>
    <p><strong>Email:</strong> <a href="mailto:${teacher.email}">${teacher.email}</a></p>
    <h3>Class Schedule:</h3>
    ${
      sortedSchedule.length === 0
        ? '<p>No classes assigned.</p>'
        : `<table class="schedule-table">
            <tr>
              <th>Period</th>
              <th>Course Name</th>
              <th>Room</th>
            </tr>
            ${sortedSchedule
              .map(
                (classItem) =>
                  `<tr>
                    <td>${classItem.period}</td>
                    <td>${classItem.courseName}</td>
                    <td>${classItem.classLoc}</td>
                  </tr>`
              )
              .join('')}
          </table>`
    }`;

  const handledCourses = new Set();
  const excludedCourses = ["seminar", "study hall", "advisory/lunch"];

  const relatedCoursesHTML = sortedSchedule
    .filter(classItem => {
      const normalizedCourse = classItem.courseName.trim().toLowerCase();
      if (handledCourses.has(normalizedCourse)) return false;
      handledCourses.add(normalizedCourse);
      return true;
    })
    .map((classItem) => {
      const normalizedCourse = classItem.courseName.trim().toLowerCase();
      if (excludedCourses.includes(normalizedCourse)) {
        return '';
      }

      const others = findOtherTeachers(classItem.courseName, teacher);
      const othersList = others
        .map(
          (other) =>
            `<li class="related-teacher" data-name="${other.name}">
              ${other.name} (${other.department})
            </li>`
        )
        .join('');

      return `<div class="related-course-block">
        <h4>Other teachers for: ${classItem.courseName}</h4>
        ${
          others.length === 0
            ? `<p class="no-related">No other teachers currently teach this course.</p>`
            : `<ul>${othersList}</ul>`
        }
      </div>`;
    })
    .join('');

  teacherInfo.innerHTML += relatedCoursesHTML;

  document.querySelectorAll('.related-teacher').forEach((el) => {
    el.addEventListener('click', () => {
      const selectedName = el.getAttribute('data-name');
      const selected = teachers.find((t) => t.name === selectedName);
      if (selected) {
        searchInput.value = selected.name;
        displayTeacherInfo(selected);
        teacherInfo.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

function findOtherTeachers(courseName, currentTeacher) {
  const excludeCourses = ["seminar", "study hall", "advisory/lunch"];
  const normalizedCourseName = courseName.trim().toLowerCase();

  if (excludeCourses.includes(normalizedCourseName)) {
    return [];
  }

  return teachers.filter(
    (t) =>
      t.name !== currentTeacher.name &&
      t.schedule.some((c) => {
        const cName = c.courseName.trim().toLowerCase();
        return (
          cName === normalizedCourseName &&
          !excludeCourses.includes(cName)
        );
      })
  );
}

const CONFIG = {
  SHEET_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRIdrYo9i51OFMSbB3s9joeMyfWy_T8RxdfKh2N1VpFagbMCXMKQXmXdd-xFuBluqGDvDlDM3QVpXNr/pub?gid=1156243365&single=true&output=csv", // keep as string placeholder
  REQUEST_THRESHOLD: 3,
  POLL_MS: 60000,
  SUBJECTS: ["Math", "Reading", "Science"],
  PERIODS: [1,2,3,4,5,6,7,8]
};

(function TutoringBoard() {
  const boardEl = document.getElementById('tutoring-board');
  const loadingEl = document.getElementById('tutoringBoardLoading');
  const errorEl = document.getElementById('tutoringBoardError');
  const diagEl = document.getElementById('diagnostics');
  const retryBtn = document.getElementById('retryBoard');
  const refreshBtn = document.getElementById('refreshBoard');
  const statusLive = document.getElementById('boardStatus');
  const tsEl = document.getElementById('boardTimestamp');

  function isConfiguredUrl(u) {
  return /^https?:\/\//.test(u) && !u.includes("{{");
}

  let pollTimer = null;

  function setLoading(v) { if (loadingEl) loadingEl.style.display = v ? 'block' : 'none'; }
  function setError(v, msg = '', detail = '') {
    if (!errorEl) return;
    errorEl.hidden = !v;
    diagEl.textContent = [msg, detail].filter(Boolean).join('\n\n');
  }

  function csvToRows(text) {
    const rows = [];
    let cur = '', inQ = false, row = [];
    for (let i = 0; i < text.length; i++) {
      const c = text[i], n = text[i+1];
      if (c === '"' && inQ && n === '"') { cur += '"'; i++; continue; }
      if (c === '"') { inQ = !inQ; continue; }
      if (c === ',' && !inQ) { row.push(cur); cur=''; continue; }
      if ((c === '\n' || c === '\r') && !inQ) {
        if (cur !== '' || row.length) { row.push(cur); rows.push(row); row=[]; cur=''; }
        continue;
      }
      cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  function parseInput(text, contentType) {
    try {
      if (contentType && contentType.includes('application/json')) {
        const json = JSON.parse(text);
        const arr = Array.isArray(json) ? json : (Array.isArray(json.data) ? json.data : []);
        return arr;
      } else {
        const rows = csvToRows(text);
        const [header, ...body] = rows;
        const idx = Object.fromEntries(header.map((h, i) => [h.trim().toLowerCase(), i]));
        return body.filter(r => r.length).map(r => ({
          period: r[idx['period']],
          subject: r[idx['subject']],
          request_count: r[idx['request_count']],
          tutor_available: r[idx['tutor_available']],
          last_updated: r[idx['last_updated']] || ''
        }));
      }
    } catch (e) {
      throw new Error('Parse failure: ' + e.message);
    }
  }

  function normalizeRows(rows) {
    const norm = rows.map(r => ({
      period: Number(String(r.period || '').trim()),
      subject: String(r.subject || '').trim(),
      request_count: Number(String(r.request_count || '0').trim()) || 0,
      tutor_available: String(r.tutor_available || 'NO').trim().toUpperCase(),
      last_updated: String(r.last_updated || '').trim()
    })).filter(r =>
      Number.isFinite(r.period) &&
      CONFIG.PERIODS.includes(r.period) &&
      CONFIG.SUBJECTS.includes(r.subject)
    );
    return norm;
  }

  function buildMap(rows) {
    const map = {};
    CONFIG.SUBJECTS.forEach(sub => {
      map[sub] = {};
      CONFIG.PERIODS.forEach(p => {
        map[sub][p] = { count: 0, available: false };
      });
    });
    rows.forEach(r => {
      map[r.subject][r.period] = {
        count: Math.max(0, r.request_count|0),
        available: (r.tutor_available || '').toUpperCase() === 'YES'
      };
    });
    return map;
  }

  function render(map, rows) {
    const table = document.createElement('table');
    table.className = 'board-table';
    table.setAttribute('role', 'grid');

    const thead = document.createElement('thead');
    const htr = document.createElement('tr');
    const th0 = document.createElement('th');
    th0.textContent = 'Subject \\ Period';
    th0.scope = 'col';
    htr.appendChild(th0);
    CONFIG.PERIODS.forEach(p => {
      const th = document.createElement('th');
      th.textContent = `P${p}`;
      th.scope = 'col';
      htr.appendChild(th);
    });
    thead.appendChild(htr);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    CONFIG.SUBJECTS.forEach(sub => {
      const tr = document.createElement('tr');
      const rowHdr = document.createElement('th');
      rowHdr.textContent = sub;
      rowHdr.scope = 'row';
      tr.appendChild(rowHdr);

      CONFIG.PERIODS.forEach(p => {
        const cell = document.createElement('td');
        const data = map[sub][p];

        const wrap = document.createElement('div');
        wrap.className = 'badges';

        const req = document.createElement('span');
        req.className = 'badge requests';
        req.textContent = `Requests: ${data.count}`;
        wrap.appendChild(req);

        const stat = document.createElement('span');
        if (data.available) {
          stat.className = 'badge status-available';
          stat.textContent = '✅ Tutor Available';
        } else if (data.count >= CONFIG.REQUEST_THRESHOLD) {
          stat.className = 'badge status-waiting';
          stat.textContent = '🔔 Needs Tutor';
          cell.classList.add('needs-tutor');
        } else {
          stat.className = 'badge status-waiting';
          stat.textContent = '⏳ Waiting';
        }
        wrap.appendChild(stat);

        cell.appendChild(wrap);
        tr.appendChild(cell);
      });

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    boardEl.innerHTML = '';
    boardEl.appendChild(table);

    const times = rows.map(r => r.last_updated).filter(Boolean);
    const latest = times.sort().slice(-1)[0] || new Date().toISOString();
    if (tsEl) tsEl.textContent = `Last updated: ${latest}`;
    if (statusLive) statusLive.textContent = 'Tutoring board updated.';
  }

async function loadBoard() {
  setLoading(true);
  setError(false);
  try {
    if (!isConfiguredUrl(CONFIG.SHEET_URL)) {
      boardEl.innerHTML = '<p style="margin:12px;color:#6b7280;">Connect your Google Sheet to display the tutoring board (set <code>CONFIG.SHEET_URL</code> in <code>script.js</code>).</p>';
      if (tsEl) tsEl.textContent = '';
      return;
    }

    const url = CONFIG.SHEET_URL + (CONFIG.SHEET_URL.includes('?') ? '&' : '?') + 't=' + Date.now();
    const resp = await fetch(url, { cache: 'no-store' });
    const text = await resp.text();
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const rowsRaw = parseInput(text, resp.headers.get('Content-Type') || '');
    const rows = normalizeRows(rowsRaw);
    const map = buildMap(rows);
    render(map, rows);

  } catch (err) {
    setError(true, String(err), (err && err.stack) ? err.stack : '');
  } finally {
    setLoading(false);
  }
}

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    const ms = Number(CONFIG.POLL_MS) || 0;
    if (ms > 0) pollTimer = setInterval(loadBoard, ms);
  }

  if (retryBtn) retryBtn.addEventListener('click', loadBoard);
  if (refreshBtn) refreshBtn.addEventListener('click', loadBoard);

  loadBoard();
  startPolling();
})();
