// Log the array of teachers for debugging
console.log('Teachers array:', teachers);

// Get DOM elements
const searchInput = document.getElementById('teacherSearch');
const suggestionsList = document.getElementById('suggestions');
const teacherInfo = document.getElementById('teacherInfo');

// Add event listener for input on the search field
searchInput.addEventListener('input', function () {
    const query = this.value.toLowerCase();
    suggestionsList.innerHTML = '';

    // Only start showing suggestions when input length is at least 2
    if (query.length < 2) {
        suggestionsList.style.display = 'none';
        return;
    }

    // Filter teachers whose name includes the search query
    const matches = teachers.filter(t => t.name.toLowerCase().includes(query));

    // Create and append list items for each matching teacher
    matches.forEach(teacher => {
        const li = document.createElement('li');
        li.textContent = teacher.name;

        // On clicking a suggestion, display teacher info
        li.addEventListener('click', () => {
            displayTeacherInfo(teacher);
            suggestionsList.style.display = 'none';
            searchInput.value = teacher.name;
        });

        suggestionsList.appendChild(li);
    });

    // Show or hide suggestion box depending on match results
    suggestionsList.style.display = matches.length ? 'block' : 'none';
});

// Function to display detailed information about a teacher
function displayTeacherInfo(teacher) {
    // Sort the teacher's schedule by period
    const sortedSchedule = teacher.schedule.sort((a, b) => a.period - b.period);

    // Build HTML for teacher info
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
                            .map(classItem => `
                                <tr>
                                    <td>${classItem.period}</td>
                                    <td>${classItem.courseName}</td>
                                    <td>${classItem.classLoc}</td>
                                </tr>
                            `)
                            .join('')}
                    </table>
                `
        }
    `;

    // Build related courses and other teachers teaching them
    const handledCourses = new Set();
    const excludedCourses = ["seminar", "study hall"];

    const relatedCoursesHTML = sortedSchedule
        .filter(classItem => {
            const normalizedCourse = classItem.courseName.trim().toLowerCase();
            if (handledCourses.has(normalizedCourse)) return false;
            handledCourses.add(normalizedCourse);
            return true;
        })
        .map(classItem => {
            const normalizedCourse = classItem.courseName.trim().toLowerCase();

            // Skip excluded courses
            if (excludedCourses.includes(normalizedCourse)) {
                return '';
            }

            // Find other teachers for this course
            const others = findOtherTeachers(classItem.courseName, teacher);

            const othersList = others
                .map(other => `
                    <li class="related-teacher" data-name="${other.name}">
                        ${other.name} (${other.department})
                    </li>
                `)
                .join('');

            return `
                <div class="related-course-block">
                    <h4>Other teachers for: ${classItem.courseName}</h4>
                    ${
                        others.length === 0
                            ? '<p class="no-related">No other teachers currently teach this course.</p>'
                            : `<ul>${othersList}</ul>`
                    }
                </div>
            `;
        })
        .join('');

    // Append related teachers section
    teacherInfo.innerHTML += relatedCoursesHTML;

    // Enable click behavior on related teachers
    document.querySelectorAll('.related-teacher').forEach(el => {
        el.addEventListener('click', () => {
            const selectedName = el.getAttribute('data-name');
            const selected = teachers.find(t => t.name === selectedName);
            if (selected) {
                searchInput.value = selected.name;
                displayTeacherInfo(selected);
                teacherInfo.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// Utility function to find other teachers for a course
function findOtherTeachers(courseName, currentTeacher) {
    const excludeCourses = ["seminar", "study hall"];
    const normalizedCourseName = courseName.trim().toLowerCase();

    if (excludeCourses.includes(normalizedCourseName)) {
        return [];
    }

    // Return teachers who teach the same course, excluding the current teacher
    return teachers.filter(t =>
        t.name !== currentTeacher.name &&
        t.schedule.some(c => {
            const cName = c.courseName.trim().toLowerCase();
            return (
                cName === normalizedCourseName &&
                !excludeCourses.includes(cName)
            );
        })
    );
}
