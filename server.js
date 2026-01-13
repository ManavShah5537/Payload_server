const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(express.json());

// ------------------
// DATABASE
// ------------------
const db = new sqlite3.Database("./data.db", (err) => {
    if (err) console.error(err.message);
    else console.log("✅ Connected to SQLite database");
});

// create table (one row per key)
db.run(`
CREATE TABLE IF NOT EXISTS payloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    api_key TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`);

// ------------------
// API: STORE / UPDATE
// ------------------
app.post("/API/payload", (req, res) => {
    const { key, payload } = req.body;

    if (!key || !payload) {
        return res.status(400).json({ error: "key and payload required" });
    }

    const sql = `
      INSERT INTO payloads (user_id, api_key)
      VALUES (?, ?)
      ON CONFLICT(api_key)
      DO UPDATE SET 
        user_id = excluded.user_id,
        created_at = CURRENT_TIMESTAMP
    `;

    db.run(sql, [payload, key], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        res.json({ message: "Stored / Updated successfully" });
    });
});

// ------------------
// API: READ BY KEY
// ------------------
app.post("/API/open_result", (req, res) => {
    const { key } = req.body;

    if (!key) {
        return res.status(400).json({ error: "key required" });
    }

    db.get(
        "SELECT * FROM payloads WHERE api_key = ?",
        [key],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });

            if (!row) {
                return res.json({ message: "No data found for this key" });
            }

            res.json(row);
        }
    );
});

// ------------------
app.listen(3000, () => {
    console.log("🚀 Server running at http://localhost:3000");
});

