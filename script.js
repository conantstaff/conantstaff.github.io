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

  teacherInfo.innerHTML = `
    <h2>${teacher.name}</h2>
    <p><strong>Email:</strong> <a href="mailto:${teacher.email}">${teacher.email}</a></p>
    <h3>Class Schedule:</h3>
    ${
      sortedSchedule.length === 0
        ? '<p>No classes assigned.</p>'
        : `
      <table class="schedule-table">
        <tr>
          <th>Period</th>
          <th>Course Name</th>
          <th>Room</th>
        </tr>
        ${sortedSchedule
          .map(
            (classItem) => `
          <tr>
            <td>${classItem.period}</td>
            <td>${classItem.courseName}</td>
            <td>${classItem.classLoc}</td>
          </tr>
        `
          )
          .join('')}
      </table>
    `
    }
  `;

  const handledCourses = new Set();
  const excludedCourses = ["seminar", "study hall"];

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
        return ''; // Don't render anything
      }

      const others = findOtherTeachers(classItem.courseName, teacher);
      if (others.length === 0) return '';

      const othersList = others
        .map(
          (other) => `
        <li class="related-teacher" data-name="${other.name}">
          ${other.name} (${other.department})
        </li>
      `
        )
        .join('');

      return `
      <div class="related-course-block">
        <h4>Other teachers for: ${classItem.courseName}</h4>
        <ul>${othersList}</ul>
      </div>
    `;
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
  const excludeCourses = ["seminar", "study hall"];
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
