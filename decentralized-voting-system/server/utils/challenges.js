// Simple in-memory challenge store with TTL
// Not suitable for multi-instance deployments; move to Redis for production scaling.

const store = new Map();

function setChallenge(key, value, ttlMs = 5 * 60 * 1000) {
  const expiresAt = Date.now() + ttlMs;
  store.set(key, { value, expiresAt });
}

function getChallenge(key) {
  const item = store.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    store.delete(key);
    return null;
  }
  return item.value;
}

function deleteChallenge(key) {
  store.delete(key);
}

module.exports = { setChallenge, getChallenge, deleteChallenge };
