/**
 * Test Runner for demonstrating CurseSearch functionality across files
 * 
 * Instructions for Testing:
 * 
 * 1. Open this file in VS Code
 * 2. Select any function name like 'runGreetingTest'
 * 3. Right-click and select "Recursive Function Search"
 * 4. Enter a search term like "validateInput"
 * 5. The extension should find all occurrences including cross-file references
 */

// Import both modules
const utils = require('./utils');
const app = require('./app');

/**
 * Tests greeting functionality
 */
function runGreetingTest() {
    console.log('=== Testing Greeting Functionality ===');
    
    // This function calls app.createGreeting which in turn calls:
    // - utils.validateInput
    // - utils.logError
    // - utils.processInput
    // - app.generateMessage
    // - app.getTimeBasedGreeting
    // - utils.formatText
    
    const greeting1 = app.createGreeting('alice');
    console.log(greeting1);
    
    const greeting2 = app.createGreeting('bob', 'engineer');
    console.log(greeting2);
    
    // Test with empty input - will trigger validation
    const greeting3 = app.createGreeting('');
    console.log(greeting3);
}

/**
 * Tests user info functionality
 */
function runUserInfoTest() {
    console.log('\n=== Testing User Info Functionality ===');
    
    // This function calls app.displayUserInfo which in turn calls:
    // - utils.validateInput
    // - utils.logError
    // - utils.processInput
    // - app.createGreeting (and all its dependencies)
    
    const user1 = {
        name: 'carol',
        title: 'manager'
    };
    
    app.displayUserInfo(user1);
    
    // Test with invalid user
    app.displayUserInfo(null);
}

/**
 * Tests direct utility functions
 */
function runUtilsTest() {
    console.log('\n=== Testing Utility Functions Directly ===');
    
    // Direct calls to utility functions
    console.log(`Formatted Text: ${utils.formatText('hello', 'world')}`);
    console.log(`Validation: ${utils.validateInput('test')}`);
    console.log(`Empty Validation: ${utils.validateInput('')}`);
    console.log(`Processed Input: ${utils.processInput('javascript', 'rocks')}`);
}

// Run all tests
function runAllTests() {
    runGreetingTest();
    runUserInfoTest();
    runUtilsTest();
    
    console.log('\n=== Testing Complete ===');
}

// Execute tests
runAllTests(); 