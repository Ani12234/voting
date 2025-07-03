const auth = require('./auth');

// Re-export all middleware for easier imports
module.exports = {
    ...auth
};
