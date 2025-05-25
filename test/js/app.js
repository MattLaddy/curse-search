/**
 * Main application file that uses utility functions
 */

// Import utility functions from utils.js
const { formatText, validateInput, processInput, logError } = require('./utils');

/**
 * Handles user input and displays a greeting
 * @param {string} name - User's name
 * @param {string} [title=''] - Optional title
 * @returns {string} Greeting message
 */
function createGreeting(name, title = '') {
    if (!validateInput(name)) {
        logError('Name cannot be empty');
        return 'Hello, Guest!';
    }
    
    const processedName = processInput(name);
    return generateMessage(processedName, title);
}

/**
 * Generates a personalized message
 * @param {string} name - User's name
 * @param {string} [title=''] - Optional title
 * @returns {string} Personalized message
 */
function generateMessage(name, title = '') {
    const greeting = getTimeBasedGreeting();
    const formattedName = title ? formatText(`${name}, ${title}`) : name;
    return `${greeting}, ${formattedName}!`;
}

/**
 * Returns a greeting based on time of day
 * @returns {string} Time-appropriate greeting
 */
function getTimeBasedGreeting() {
    const hour = new Date().getHours();
    
    if (hour < 12) {
        return 'Good morning';
    } else if (hour < 18) {
        return 'Good afternoon';
    } else {
        return 'Good evening';
    }
}

/**
 * Displays all user info
 * @param {object} user - User object
 */
function displayUserInfo(user) {
    if (!user || !validateInput(user.name)) {
        logError('Invalid user data');
        return;
    }
    
    console.log('User Information:');
    console.log('-----------------');
    console.log(`Name: ${processInput(user.name)}`);
    
    if (user.title) {
        console.log(`Title: ${user.title}`);
    }
    
    console.log(`Greeting: ${createGreeting(user.name, user.title)}`);
}

// Example usage
const user = {
    name: 'john',
    title: 'developer'
};

displayUserInfo(user);

// Export functions for testing
module.exports = {
    createGreeting,
    generateMessage,
    getTimeBasedGreeting,
    displayUserInfo
}; 