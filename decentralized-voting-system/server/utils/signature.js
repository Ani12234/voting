const crypto = require('crypto');
const { ethers } = require('ethers');

function makeNonce(bytes = 16) {
  return crypto.randomBytes(bytes).toString('hex');
}

function buildChallenge(address, voteId, nonce) {
  return `Sign to download invoice.\nAddress:${address.toLowerCase()}\nVote:${voteId}\nNonce:${nonce}`;
}

async function verifySignature(address, signature, message) {
  try {
    // ethers v6 verify
    const recovered = ethers.verifyMessage(message, signature);
    return recovered.toLowerCase() === address.toLowerCase();
  } catch (e) {
    return false;
  }
}

function derivePassword({ address, voteId, serverPepper, signature }) {
  // Use HKDF over keccak(signature) with salt=voteId and info label
  const hash = crypto.createHash('sha3-256').update(Buffer.from(signature.replace(/^0x/, ''), 'hex')).digest();
  const salt = Buffer.from(String(voteId));
  const info = Buffer.from('pdf-pass');
  const key = hkdf(hash, 16, { salt, info }); // 16 bytes
  // Base64url without padding makes a good human-friendly password
  return key.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function hkdf(ikm, length, { salt, info }) {
  // HKDF-Extract
  const prk = crypto.createHmac('sha256', salt).update(ikm).digest();
  // HKDF-Expand
  let t = Buffer.alloc(0);
  const okm = Buffer.alloc(length);
  let block = Buffer.alloc(0);
  let pos = 0;
  let counter = 1;
  while (pos < length) {
    const hmac = crypto.createHmac('sha256', prk);
    hmac.update(block);
    hmac.update(info);
    hmac.update(Buffer.from([counter]));
    block = hmac.digest();
    const toCopy = Math.min(block.length, length - pos);
    block.copy(okm, pos, 0, toCopy);
    pos += toCopy;
    counter += 1;
  }
  return okm;
}

module.exports = { makeNonce, buildChallenge, verifySignature, derivePassword };
