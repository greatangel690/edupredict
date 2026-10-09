// =========================================
// EduPredict - Frontend JavaScript
// =========================================

const $ = (id) => document.getElementById(id);

let students = [];


// =========================================
// Load Students
// =========================================

async function loadStudents() {
    const r = await fetch('/api/students');

    students = await r.json();

    render();
}


// =========================================
// Render Student Records
// =========================================

function render() {
    const body = $('recordsBody');

    body.innerHTML = '';

    students.forEach((s) => {
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td>${safe(s.full_name)}</td>

            <td>${safe(s.student_id)}</td>

            <td>${safe(s.department || '—')}</td>

            <td>${safe(s.level || '—')}</td>

            <td>
                ${s.assignment}/10 +
                ${s.test}/20 +
                ${s.examination}/70
            </td>

            <td>
                <b>${s.total_score}%</b>
            </td>

            <td>
                ${safe(s.performance)}
            </td>

            <td>
                ${safe(s.risk_level)}
            </td>

            <td>
                <button
                    class="delete"
                    onclick="removeStudent(${s.id})"
                >
                    Delete
                </button>
            </td>
        `;

        body.appendChild(tr);
    });


    // Update student count
    $('studentCount').textContent = students.length;


    // Calculate average score
    const avg = students.length
        ? Math.round(
            students.reduce(
                (a, s) => a + Number(s.total_score),
                0
            ) / students.length
        )
        : 0;

    $('averageScore').textContent = avg + '%';


    // Count high-risk students
    $('riskCount').textContent =
        students.filter(
            (s) =>
                String(s.risk_level).includes('High')
        ).length;
}


// =========================================
// Make Text Safe
// =========================================

function safe(v) {
    return String(v ?? '').replace(
        /[&<>"']/g,
        (m) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m])
    );
}


// =========================================
// Prediction Form
// =========================================

$('predictionForm').addEventListener(
    'submit',
    async (e) => {

        e.preventDefault();


        // Collect form information
        const payload = {

            studentId:
                $('studentId').value.trim(),

            fullName:
                $('fullName').value.trim(),

            gender:
                $('gender').value,

            dob:
                $('dob').value,

            department:
                $('department').value.trim(),

            level:
                $('level').value,

            semester:
                $('semester').value,

            course:
                $('course').value.trim(),

            attendance:
                $('attendance').value,

            assignment:
                $('assignment').value,

            test:
                $('test').value,

            examination:
                $('examination').value
        };


        // Send information to server
        const r = await fetch(
            '/api/predict',
            {
                method: 'POST',

                headers: {
                    'Content-Type':
                        'application/json'
                },

                body: JSON.stringify(payload)
            }
        );


        const data = await r.json();


        // Handle error
        if (!r.ok) {
            alert(
                data.error ||
                'Unable to save record'
            );

            return;
        }


        // Get prediction result
        const p = data.prediction;


        // Display prediction
        $('score').textContent =
            p.total + '%';

        $('fill').style.width =
            p.total + '%';

        $('performance').textContent =
            p.performance;

        $('risk').textContent =
            p.risk;

        $('recommendation').textContent =
            p.recommendation;


        // Reload student records
        await loadStudents();


        // Scroll to records
        document
            .querySelector('#records')
            .scrollIntoView({
                behavior: 'smooth'
            });
    }
);


// =========================================
// Delete One Student
// =========================================

async function removeStudent(id) {

    if (
        !confirm(
            'Delete this student record?'
        )
    ) {
        return;
    }


    await fetch(
        '/api/students/' + id,
        {
            method: 'DELETE'
        }
    );


    loadStudents();
}


// =========================================
// Delete All Students
// =========================================

$('clearAll').addEventListener(
    'click',
    async () => {

        if (!students.length) {
            return;
        }


        if (
            confirm(
                'Delete all student records?'
            )
        ) {

            await fetch(
                '/api/students',
                {
                    method: 'DELETE'
                }
            );


            loadStudents();
        }
    }
);


// =========================================
// Load Records When Page Opens
// =========================================

loadStudents();