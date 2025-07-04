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
  // Sort schedule by period number (ascending)
  const sortedSchedule = teacher.schedule.sort((a, b) => a.period - b.period);

  teacherInfo.innerHTML = `
    <h2>${teacher.name}</h2>
    <p><strong>Email:</strong> <a href="mailto:${teacher.email}">${teacher.email}</a></p>
    <h3>Class Schedule:</h3>
    ${sortedSchedule.length === 0 ? '<p>No classes assigned.</p>' : `
      <table class="schedule-table">
        <tr>
          <th>Period</th>
          <th>Course Name</th>
          <th>Room</th>
        </tr>
        ${sortedSchedule.map(classItem => `
          <tr>
            <td>${classItem.period}</td>
            <td>${classItem.courseName}</td>
            <td>${classItem.classLoc}</td>
          </tr>
        `).join('')}
      </table>
    `}
  `;
}
