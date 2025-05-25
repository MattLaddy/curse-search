/**
 * Utility functions for testing cross-file function calls
 */

/**
 * Formats a string by capitalizing first letter and adding a suffix
 * @param {string} text - The text to format
 * @param {string} [suffix=''] - Optional suffix to append
 * @returns {string} Formatted text
 */
function formatText(text, suffix = '') {
    const formattedText = text.charAt(0).toUpperCase() + text.slice(1);
    return appendSuffix(formattedText, suffix);
}

/**
 * Appends a suffix to a string
 * @param {string} text - The base text
 * @param {string} suffix - The suffix to append
 * @returns {string} Text with suffix
 */
function appendSuffix(text, suffix) {
    return suffix ? `${text} ${suffix}` : text;
}

/**
 * Validates that input is not empty
 * @param {string} input - The input to validate
 * @returns {boolean} Whether input is valid
 */
function validateInput(input) {
    return Boolean(input && input.trim().length > 0);
}

/**
 * Processes input by validating and formatting it
 * @param {string} input - The input to process
 * @param {string} [suffix=''] - Optional suffix
 * @returns {string|null} Processed text or null if invalid
 */
function processInput(input, suffix = '') {
    if (!validateInput(input)) {
        logError('Invalid input');
        return null;
    }
    
    return formatText(input, suffix);
}

/**
 * Logs an error message
 * @param {string} message - The error message
 */
function logError(message) {
    console.error(`Error: ${message}`);
}

// Export functions
module.exports = {
    formatText,
    validateInput,
    processInput,
    logError
}; 