# Curse Search

A VS Code extension for recursive function call searching.

## Features

### Recursive Function Search

This extension provides a powerful recursive search tool that finds all occurrences of a function or variable, including indirect references through nested function calls.

For example, if function A calls function B, and function B calls function C, searching for "C" will highlight all relevant code sections, including those in function A.

To use:
1. Select the code you want to analyze
2. Right-click and choose "Recursive Function Search" from the context menu
3. Enter the function or variable name to search for
4. The extension will highlight all direct and indirect references in the selected text

## How It Works

The extension:
1. Parses the selected code into an Abstract Syntax Tree (AST)
2. Builds a call graph tracking which functions call other functions
3. Identifies direct references to the search target
4. Recursively traverses the call graph to find indirect references
5. Highlights all relevant occurrences in the editor

## Usage

See [USAGE.md](USAGE.md) for detailed usage instructions and examples.

## Supported Languages

The recursive search works with JavaScript, TypeScript, JSX, and similar languages. Support for other languages may vary based on the parser capabilities.
