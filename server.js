require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();

// ===============================
// Middleware
// ===============================
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ===============================
// MySQL Database Connection
// ===============================
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

// ===============================
// Prediction Function
// ===============================
function prediction(assignment, test, examination, attendance) {
    const total = Math.round(
        assignment + test + examination
    );

    let performance;
    let risk;
    let recommendation;

    if (total >= 70) {
        performance = 'Excellent Performance';

        risk =
            attendance < 75
                ? 'Moderate Intervention Risk'
                : 'Low Intervention Risk';

        recommendation =
            'Maintain consistent study habits and assessment preparation.';
    } 
    
    else if (total >= 50) {
        performance = 'Good Performance';

        risk =
            attendance < 75
                ? 'High Intervention Risk'
                : 'Moderate Intervention Risk';

        recommendation =
            'Provide targeted academic support and monitor weaker areas and attendance.';
    } 
    
    else {
        performance = 'Needs Attention';

        risk = 'High Intervention Risk';

        recommendation =
            'Schedule timely academic intervention, closer monitoring and targeted support.';
    }

    return {
        total,
        performance,
        risk,
        recommendation
    };
}

// ===============================
// GET ALL STUDENTS
// ===============================
app.get('/api/students', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM students ORDER BY created_at DESC'
        );

        res.json(rows);
    } catch (e) {
        res.status(500).json({
            error: e.message
        });
    }
});

// ===============================
// SAVE STUDENT / PREDICT PERFORMANCE
// ===============================
app.post('/api/predict', async (req, res) => {
    try {
        const {
            studentId,
            fullName,
            gender,
            dob,
            department,
            level,
            semester,
            course,
            attendance,
            assignment,
            test,
            examination
        } = req.body;

        // Check required fields
        if (!studentId || !fullName) {
            return res.status(400).json({
                error: 'Student ID and name are required'
            });
        }

        // ===============================
        // Validate and limit scores
        // ===============================

        const a = Math.max(
            0,
            Math.min(10, Number(assignment) || 0)
        );

        const t = Math.max(
            0,
            Math.min(20, Number(test) || 0)
        );

        const e = Math.max(
            0,
            Math.min(70, Number(examination) || 0)
        );

        const att = Math.max(
            0,
            Math.min(100, Number(attendance) || 0)
        );

        // ===============================
        // Generate Prediction
        // ===============================

        const p = prediction(
            a,
            t,
            e,
            att
        );

        // ===============================
        // Insert / Update Student
        // ===============================

        const sql = `
            INSERT INTO students (
                student_id,
                full_name,
                gender,
                date_of_birth,
                department,
                level,
                semester,
                course,
                attendance,
                assignment,
                test,
                examination,
                total_score,
                performance,
                risk_level,
                recommendation
            )

            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

            ON DUPLICATE KEY UPDATE
                full_name = VALUES(full_name),
                gender = VALUES(gender),
                date_of_birth = VALUES(date_of_birth),
                department = VALUES(department),
                level = VALUES(level),
                semester = VALUES(semester),
                course = VALUES(course),
                attendance = VALUES(attendance),
                assignment = VALUES(assignment),
                test = VALUES(test),
                examination = VALUES(examination),
                total_score = VALUES(total_score),
                performance = VALUES(performance),
                risk_level = VALUES(risk_level),
                recommendation = VALUES(recommendation)
        `;

        await pool.execute(sql, [
            studentId,
            fullName,
            gender || null,
            dob || null,
            department || null,
            level || null,
            semester || null,
            course || null,
            att,
            a,
            t,
            e,
            p.total,
            p.performance,
            p.risk,
            p.recommendation
        ]);

        // ===============================
        // Send Response
        // ===============================

        res.json({
            success: true,
            prediction: p
        });

    } catch (e) {
        res.status(500).json({
            error: e.message
        });
    }
});

// ===============================
// DELETE ONE STUDENT
// ===============================
app.delete('/api/students/:id', async (req, res) => {
    try {
        await pool.execute(
            'DELETE FROM students WHERE id = ?',
            [req.params.id]
        );

        res.json({
            success: true
        });

    } catch (e) {
        res.status(500).json({
            error: e.message
        });
    }
});

// ===============================
// DELETE ALL STUDENTS
// ===============================
app.delete('/api/students', async (req, res) => {
    try {
        await pool.query(
            'DELETE FROM students'
        );

        res.json({
            success: true
        });

    } catch (e) {
        res.status(500).json({
            error: e.message
        });
    }
});

// ===============================
// START SERVER
// ===============================
const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(
        `EduPredict running on http://localhost:${port}`
    );
});