const crypto = require("crypto");
const fs = require("fs");
function derToPublicKey(derBuffer) {
  return crypto.createPublicKey({
    key: derBuffer,
    format: "der",
    type: "spki"
  });
}

// 🔒 ROOT OF TRUST — Election Commission public key
// This file must be protected and never come from the client
const pk_comm = fs.readFileSync("./keys/pk_comm.pem");

function verifySignature(req, res, next) {
  try {
    const {
      vote_data,
      sig_evm,
      sig_staff,
      sig_comm,
      cert_staff,
      cert_evm,
      pk_staff,
      pk_evm
    } = req.body;

    // 1️⃣ Basic field check
    if (
      !vote_data || !sig_evm || !sig_staff || !sig_comm ||
      !cert_staff || !cert_evm || !pk_staff || !pk_evm
    ) {
      return res.status(400).json({ error: "Missing cryptographic fields" });
    }

    // 2️⃣ Decode all base64 → Buffer
    const voteBuf = Buffer.from(vote_data, "base64");
    const sigEvmBuf = Buffer.from(sig_evm, "base64");
    const sigStaffBuf = Buffer.from(sig_staff, "base64");
    const sigCommBuf = Buffer.from(sig_comm, "base64");
    const certStaffBuf = Buffer.from(cert_staff, "base64");
    const certEvmBuf = Buffer.from(cert_evm, "base64");
    const pkStaffBuf = Buffer.from(pk_staff, "base64");
    const pkEvmBuf = Buffer.from(pk_evm, "base64");
    const pkStaffKey = derToPublicKey(pkStaffBuf);
    const pkEvmKey = derToPublicKey(pkEvmBuf);


    // 3️⃣ Verify Commissioner → Staff certificate
    if (!crypto.verify(null, pkStaffBuf, pk_comm, certStaffBuf))
      throw "Invalid staff certificate";

    // 4️⃣ Verify Staff → EVM certificate
    if (!crypto.verify(null, pkEvmBuf, pkStaffKey, certEvmBuf))
      throw "Invalid EVM certificate";

    // 5️⃣ Verify EVM → Vote signature
    if (!crypto.verify(null, voteBuf, pkEvmKey, sigEvmBuf))
      throw "Invalid EVM signature";

    // 6️⃣ Verify Staff → (Vote + sig_evm)
    if (!crypto.verify(null, Buffer.concat([voteBuf, sigEvmBuf]), pkStaffKey, sigStaffBuf))
      throw "Invalid staff signature";

    // 7️⃣ Verify Commissioner → final bundle
    if (
      !crypto.verify(
        null,
        Buffer.concat([voteBuf, sigEvmBuf, sigStaffBuf]),
        pk_comm,
        sigCommBuf
      )
    ) throw "Invalid commissioner signature";

    // ✅ All checks passed
    req.verifiedVote = {
      vote: voteBuf.toString(),
      evm_public_key: pkEvmBuf.toString("base64")
    };

    next();

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: "Signature verification failed",
      error: err.toString()
    });
  }
}

module.exports = verifySignature;