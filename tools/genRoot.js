const crypto = require("crypto");
const fs = require("fs");

const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");

fs.mkdirSync("keys", { recursive: true });

fs.writeFileSync("keys/pk_comm.pem", publicKey.export({ type: "spki", format: "pem" }));
fs.writeFileSync("keys/sk_comm.pem", privateKey.export({ type: "pkcs8", format: "pem" }));

console.log("✅ Root keys generated:");
console.log("keys/pk_comm.pem");
console.log("keys/sk_comm.pem");