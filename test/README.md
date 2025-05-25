# CurseSearch Extension Test

This directory contains test files for verifying the functionality of the CurseSearch extension, especially its ability to find function calls across multiple files.

## Test Files

- `js/utils.js` - Contains utility functions that are imported by other files
- `js/app.js` - Main application file that imports and uses utility functions
- `js/test-runner.js` - Test runner that demonstrates function call chains across files

## How to Test Cross-File Function Search

1. Open VS Code with the CurseSearch extension installed
2. Open the `test-runner.js` file
3. Select a function name (e.g., select the text `runGreetingTest`)
4. Right-click and select "Recursive Function Search" from the context menu
5. Enter a search term like `validateInput` or `formatText`

### Expected Results

The CurseSearch extension should:

1. Show the search results in the sidebar
2. Display matches found in both the selected function and in other files
3. Allow you to click on the results to navigate to their locations

## Function Call Graph

Here's a simplified view of the function call relationships:

```
runGreetingTest
  └── app.createGreeting
       ├── utils.validateInput
       ├── utils.logError
       ├── utils.processInput
       │    ├── utils.validateInput
       │    ├── utils.logError
       │    └── utils.formatText
       │         └── utils.appendSuffix
       └── app.generateMessage
            ├── app.getTimeBasedGreeting
            └── utils.formatText
                 └── utils.appendSuffix
```

This test demonstrates how CurseSearch can find these relationships across files, which is particularly useful in larger codebases. 