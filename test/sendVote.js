const crypto = require("crypto");
const fs = require("fs");
const path = require('path');
const https = require("https");
function getCurrentDateTime() {
  const now = new Date();

  const formatted = now.toLocaleString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });

  return formatted;
}

// ---- load commissioner keys ----
const sk_comm = fs.readFileSync("keys/sk_comm.pem");

// ---- generate staff + evm keys ----
const staff = crypto.generateKeyPairSync("ed25519");
const evm = crypto.generateKeyPairSync("ed25519");

const pk_staff = staff.publicKey.export({ type: "spki", format: "der" });
const pk_evm = evm.publicKey.export({ type: "spki", format: "der" });

// ---- certificates ----
const cert_staff = crypto.sign(null, pk_staff, sk_comm);
const cert_evm = crypto.sign(null, pk_evm, staff.privateKey);

// ---- EVM signs vote ----
const vote = Buffer.from("Candidate=A | Booth=12 | Time: " + getCurrentDateTime());
const sig_evm = crypto.sign(null, vote, evm.privateKey);

// ---- Staff countersigns ----
const staff_blob = Buffer.concat([vote, sig_evm]);
const sig_staff = crypto.sign(null, staff_blob, staff.privateKey);

// ---- Commissioner finalizes ----
const final_blob = Buffer.concat([vote, sig_evm, sig_staff]);
const sig_comm = crypto.sign(null, final_blob, sk_comm);
// ❌ TAMPER THE DATA AFTER SIGNING
// vote[0] = vote[0] ^ 0xff;   // flips one byte

// ---- build request body ----
const body = JSON.stringify({
  vote_data: vote.toString("base64"),
  sig_evm: sig_evm.toString("base64"),
  sig_staff: sig_staff.toString("base64"),
  sig_comm: sig_comm.toString("base64"),
  cert_staff: cert_staff.toString("base64"),
  cert_evm: cert_evm.toString("base64"),
  pk_staff: pk_staff.toString("base64"),
  pk_evm: pk_evm.toString("base64")
});

// ---- send to your server ----
const certPath = path.join(__dirname, '..', 'tls', 'server.crt');
const req = https.request(
  {
    hostname: "localhost",
    port: 3000,
    path: "/API/payload",
    method: "POST",
    ca: fs.readFileSync(certPath),  // Trust our self-signed cert
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body)
    }
  },
  res => {
    let data = "";
    res.on("data", d => (data += d));
    res.on("end", () => {
      console.log("Status:", res.statusCode);
      console.log("Response:", data);
    });
  }
);

req.on("error", e => console.error("Request error:", e));
req.write(body);
req.end();