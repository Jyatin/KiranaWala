/**
 * KiranaWala — Input Sanitization and Escaping Utilities
 *
 * Prevents Regex Denial of Service (ReDoS) and regex injection attacks
 * when constructing RegExp from user-supplied search parameters.
 */

function escapeRegex(text) {
  if (typeof text !== "string") {
    return "";
  }
  // Escapes all RegExp special characters: \ ^ $ * + ? . ( ) | { } [ ]
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  escapeRegex,
};
