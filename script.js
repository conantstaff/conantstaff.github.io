console.log('Teachers array:', teachers);

const searchInput = document.getElementById('teacherSearch');
const clearBtn = document.getElementById('clearSearch');
const departmentFilter = document.getElementById('departmentFilter');
const suggestionsList = document.getElementById('suggestions');
const teacherInfo = document.getElementById('teacherInfo');

// Event: Clear button clears input, department filter, and resets list/display
clearBtn.addEventListener('click', () => {
  searchInput.value = '';
  if (departmentFilter) departmentFilter.value = '';
  suggestionsList.innerHTML = '';
  suggestionsList.style.display = 'none';
  teacherInfo.innerHTML = '';
});

// Event: Live search input with autocomplete, filtered by department if selected
searchInput.addEventListener('input', function () {
  const query = this.value.toLowerCase();
  suggestionsList.innerHTML = '';

  if (query.length < 2) {
    suggestionsList.style.display = 'none';
    return;
  }

  let filteredTeachers = teachers.filter(t =>
    t.name.toLowerCase().includes(query)
  );

  // Filter by department if set
  if (departmentFilter && departmentFilter.value) {
    const dept = departmentFilter.value.toLowerCase();
    filteredTeachers = filteredTeachers.filter(t => t.department.toLowerCase() === dept);
  }

  filteredTeachers.forEach(teacher => {
    const li = document.createElement('li');
    li.textContent = teacher.name;
    li.addEventListener('click', () => {
      displayTeacherInfo(teacher);
      suggestionsList.style.display = 'none';
      searchInput.value = teacher.name;
    });
    suggestionsList.appendChild(li);
  });

  suggestionsList.style.display = filteredTeachers.length ? 'block' : 'none';
});

// Optionally, handle department filter change to update suggestions (optional UX improvement)
if (departmentFilter) {
  departmentFilter.addEventListener('change', () => {
    searchInput.dispatchEvent(new Event('input')); // Re-trigger search input event
  });
}

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
        return '';
      }

      const others = findOtherTeachers(classItem.courseName, teacher);

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
        ${
          others.length === 0
            ? `<p class="no-related">No other teachers currently teach this course.</p>`
            : `<ul>${othersList}</ul>`
        }
      </div>
    `;
    })
    .join('');

  teacherInfo.innerHTML += relatedCoursesHTML;

  // Add click event for related teacher names
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
