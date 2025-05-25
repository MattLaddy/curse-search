# Recursive Function Search Usage Guide

This extension adds a powerful feature that helps you find functions and variables that are referenced indirectly through nested function calls.

## How It Works

Traditional search tools can only find direct references to a function or variable. The recursive search goes deeper by analyzing the code's call graph to find indirect references as well.

For example, if:
- Function A calls function B
- Function B calls function C

When you search for "C" while highlighting the code containing function A, the search will:
1. Recognize that C is called by B
2. Recognize that B is called by A
3. Highlight all relevant occurrences

## How to Use

1. Select the code you want to analyze (e.g., a function, a class, or a block of code)
2. Right-click on the selected text
3. Choose "Recursive Function Search" from the context menu
4. Enter the name of the function or variable you want to search for
5. The extension will highlight all occurrences, both direct and indirect

## Example

Consider this simple code:

```javascript
function processData(data) {
  const validData = validateInput(data);
  
  if (validData) {
    return transformData(validData);
  }
  
  return null;
}

function validateInput(input) {
  if (!input) return null;
  if (checkFormat(input)) return input;
  return null;
}

function checkFormat(data) {
  if (typeof data !== 'object') return false;
  return deepValidation(data);
}

function deepValidation(obj) {
  if (!obj.hasOwnProperty('id')) return false;
  return true;
}
```

If you select the entire `processData` function and search for "deepValidation", the tool will:
1. Identify that `processData` calls `validateInput`
2. Identify that `validateInput` calls `checkFormat`
3. Identify that `checkFormat` calls `deepValidation`
4. Highlight all occurrences within your selection

## Supported Languages

The recursive search works with JavaScript, TypeScript, JSX, and similar languages. Support for other languages may vary based on the parser capabilities.

## Tips

- Select larger blocks of code to ensure the analyzer can understand the full call graph
- The search is most effective when the code is well-structured with clear function names
- If you don't get expected results, try selecting a larger code block

## Limitations

- The tool analyzes the selected code only, not the entire file or project
- It may not detect dynamic function calls or calls through complex patterns
- The analysis is based on static code and doesn't execute the code 