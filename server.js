const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const verifySignature = require("./middleware/verifySignature");

const https = require("https");
const fs = require("fs");

const app = express();
app.use(express.json());

// ------------------
// TLS CONFIG
// ------------------
const tlsOptions = {
    key: fs.readFileSync("tls/server.key"),
    cert: fs.readFileSync("tls/server.crt")
};

// ------------------
// DATABASE
// ------------------
const db = new sqlite3.Database("./data.db", (err) => {
    if (err) console.error(err.message);
    else console.log("✅ Connected to SQLite database");
});

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
app.post("/API/payload", verifySignature, (req, res) => {
    const { vote, evm_public_key } = req.verifiedVote;

    console.log("Verified vote:", vote);

    res.json({
        success: true,
        message: "Payload verified and accepted",
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
// START HTTPS SERVER
// ------------------
https.createServer(tlsOptions, app).listen(3000, () => {
    console.log("🚀 HTTPS Server running at https://localhost:3000");
});
