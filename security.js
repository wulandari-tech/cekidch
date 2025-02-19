function sanitizeString(str) {
    return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

module.exports = {
    sanitizeString
};
