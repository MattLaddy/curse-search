import * as vscode from 'vscode';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { SearchResult, SearchResultsViewProvider } from './searchResultsView';

/**
 * Interface to track function locations and content
 */
interface FunctionInfo {
    name: string;
    startPos: number;
    endPos: number;
    content: string;
}

/**
 * Parse the code and build a call graph of function dependencies
 */
function buildCallGraph(code: string): {
    callGraph: Map<string, Set<string>>,
    functionInfoMap: Map<string, FunctionInfo>
} {
    const callGraph = new Map<string, Set<string>>();
    const functionInfoMap = new Map<string, FunctionInfo>();
    
    try {
        // Parse the code using Babel
        const ast = parser.parse(code, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx'],
        });
        
        // Current function being analyzed
        let currentFunction: string | null = null;
        
        // Traverse the AST to build the call graph
        traverse(ast, {
            // Track function declarations
            FunctionDeclaration(path) {
                if (path.node.id && path.node.id.name) {
                    const functionName = path.node.id.name;
                    currentFunction = functionName;
                    if (!callGraph.has(functionName)) {
                        callGraph.set(functionName, new Set<string>());
                    }
                    
                    // Store the function's content and location
                    if (path.node.start !== null && path.node.start !== undefined &&
                        path.node.end !== null && path.node.end !== undefined) {
                        functionInfoMap.set(functionName, {
                            name: functionName,
                            startPos: path.node.start,
                            endPos: path.node.end,
                            content: code.substring(path.node.start, path.node.end)
                        });
                    }
                }
            },
            
            // Track method definitions in classes
            ClassMethod(path) {
                if (path.node.key.type === 'Identifier') {
                    const methodName = path.node.key.name;
                    currentFunction = methodName;
                    if (!callGraph.has(methodName)) {
                        callGraph.set(methodName, new Set<string>());
                    }
                    
                    // Store the method's content and location
                    if (path.node.start !== null && path.node.start !== undefined && 
                        path.node.end !== null && path.node.end !== undefined) {
                        functionInfoMap.set(methodName, {
                            name: methodName,
                            startPos: path.node.start,
                            endPos: path.node.end,
                            content: code.substring(path.node.start, path.node.end)
                        });
                    }
                }
            },
            
            // Track arrow functions assigned to variables
            VariableDeclarator(path) {
                if (path.node.id.type === 'Identifier' && 
                    (t.isArrowFunctionExpression(path.node.init) || t.isFunctionExpression(path.node.init))) {
                    const functionName = path.node.id.name;
                    currentFunction = functionName;
                    if (!callGraph.has(functionName)) {
                        callGraph.set(functionName, new Set<string>());
                    }
                    
                    // Store the function's content and location
                    if (path.node.init && 
                        path.node.init.start !== null && path.node.init.start !== undefined && 
                        path.node.init.end !== null && path.node.init.end !== undefined) {
                        functionInfoMap.set(functionName, {
                            name: functionName,
                            startPos: path.node.init.start,
                            endPos: path.node.init.end,
                            content: code.substring(path.node.init.start, path.node.init.end)
                        });
                    }
                }
            },
            
            // Track function calls within functions
            CallExpression(path) {
                if (currentFunction) {
                    let calledFunction = '';
                    
                    // Handle direct identifier calls: functionName()
                    if (path.node.callee.type === 'Identifier') {
                        calledFunction = path.node.callee.name;
                    } 
                    // Handle member expression calls: object.method()
                    else if (path.node.callee.type === 'MemberExpression' && 
                            path.node.callee.property.type === 'Identifier') {
                        calledFunction = path.node.callee.property.name;
                    }
                    
                    if (calledFunction && calledFunction !== '') {
                        const currentFunctionCalls = callGraph.get(currentFunction);
                        if (currentFunctionCalls) {
                            currentFunctionCalls.add(calledFunction);
                            
                            // Create entry for the called function if it doesn't exist yet
                            if (!callGraph.has(calledFunction)) {
                                callGraph.set(calledFunction, new Set<string>());
                            }
                        }
                    }
                }
            },
            
            // Exit handlers
            exit(path) {
                if (
                    (path.isFunctionDeclaration() || path.isClassMethod() || path.isVariableDeclarator()) && 
                    currentFunction !== null
                ) {
                    currentFunction = null;
                }
            }
        });
        
        return { callGraph, functionInfoMap };
    } catch (error) {
        console.error('Error parsing code:', error);
        return { callGraph, functionInfoMap };
    }
}

/**
 * Find all functions that directly or indirectly call the target function
 */
function findTransitiveCalls(callGraph: Map<string, Set<string>>, targetFunction: string): Set<string> {
    const callers = new Set<string>();
    
    // Find direct callers
    for (const [caller, callees] of callGraph.entries()) {
        if (callees.has(targetFunction)) {
            callers.add(caller);
        }
    }
    
    // Find indirect callers recursively
    let size = 0;
    while (size !== callers.size) {
        size = callers.size;
        for (const [caller, callees] of callGraph.entries()) {
            if (!callers.has(caller)) {
                for (const callee of callees) {
                    if (callers.has(callee)) {
                        callers.add(caller);
                        break;
                    }
                }
            }
        }
    }
    
    return callers;
}

/**
 * Extract potential imported functions from require/import statements
 * @param code The source code to analyze
 * @returns A map of local names to imported functions
 */
function extractImportedFunctions(code: string): Map<string, string> {
    const importedFunctions = new Map<string, string>();
    
    try {
        // Parse the code using Babel
        const ast = parser.parse(code, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx'],
        });
        
        // Traverse the AST to find imports
        traverse(ast, {
            // Handle CommonJS require statements
            VariableDeclarator(path) {
                if (path.node.init?.type === 'CallExpression' &&
                    path.node.init.callee.type === 'Identifier' &&
                    path.node.init.callee.name === 'require') {
                    
                    // Handle destructuring requires: const { func1, func2 } = require('./module')
                    if (path.node.id.type === 'ObjectPattern') {
                        for (const prop of path.node.id.properties) {
                            if (prop.type === 'ObjectProperty' && 
                                prop.key.type === 'Identifier' && 
                                prop.value.type === 'Identifier') {
                                importedFunctions.set(prop.value.name, prop.key.name);
                            }
                        }
                    }
                    
                    // Handle direct requires: const module = require('./module')
                    if (path.node.id.type === 'Identifier') {
                        const moduleName = path.node.id.name;
                        
                        // Find where the module is used like: module.function()
                        path.scope.bindings[moduleName]?.referencePaths.forEach(refPath => {
                            const parent = refPath.parent;
                            if (parent.type === 'MemberExpression' && 
                                parent.property.type === 'Identifier') {
                                const importedName = parent.property.name;
                                importedFunctions.set(`${moduleName}.${importedName}`, importedName);
                            }
                        });
                    }
                }
            },
            
            // Handle ES6 import statements
            ImportDeclaration(path) {
                // Handle named imports: import { func1, func2 } from './module'
                path.node.specifiers.forEach(specifier => {
                    if (specifier.type === 'ImportSpecifier' &&
                        specifier.imported.type === 'Identifier' &&
                        specifier.local.type === 'Identifier') {
                        importedFunctions.set(specifier.local.name, specifier.imported.name);
                    }
                });
                
                // Handle default imports: import module from './module'
                path.node.specifiers.forEach(specifier => {
                    if (specifier.type === 'ImportDefaultSpecifier' &&
                        specifier.local.type === 'Identifier') {
                        const moduleName = specifier.local.name;
                        
                        // Similar to require case, track module.function usage
                        path.scope.bindings[moduleName]?.referencePaths.forEach(refPath => {
                            const parent = refPath.parent;
                            if (parent.type === 'MemberExpression' && 
                                parent.property.type === 'Identifier') {
                                const importedName = parent.property.name;
                                importedFunctions.set(`${moduleName}.${importedName}`, importedName);
                            }
                        });
                    }
                });
            }
        });
    } catch (error) {
        console.error('Error extracting imports:', error);
    }
    
    return importedFunctions;
}

/**
 * Find all functions that the target function directly or indirectly calls
 */
function findNestedCalls(callGraph: Map<string, Set<string>>, targetFunction: string): Set<string> {
    const callees = new Set<string>();
    const toProcess = new Set<string>([targetFunction]);
    
    // Process the queue until we've found all nested calls
    while (toProcess.size > 0) {
        const current = toProcess.values().next().value;
        toProcess.delete(current);
        
        const directCallees = callGraph.get(current);
        if (directCallees) {
            for (const callee of directCallees) {
                if (!callees.has(callee)) {
                    callees.add(callee);
                    toProcess.add(callee);
                }
            }
        }
    }
    
    return callees;
}

/**
 * Get the line of text containing a match
 */
function getTextLineForMatch(text: string, index: number, matchLength: number, maxLineLength: number = 100): string {
    // Find the start of the line
    let lineStart = index;
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
        lineStart--;
    }
    
    // Find the end of the line
    let lineEnd = index + matchLength;
    while (lineEnd < text.length && text[lineEnd] !== '\n') {
        lineEnd++;
    }
    
    // Extract the line text
    let line = text.substring(lineStart, lineEnd);
    
    // Trim the line if it's too long
    if (line.length > maxLineLength) {
        const startOffset = Math.max(0, index - lineStart - Math.floor(maxLineLength / 2));
        line = (startOffset > 0 ? '...' : '') + 
               line.substring(startOffset, startOffset + maxLineLength) + 
               (startOffset + maxLineLength < line.length ? '...' : '');
    }
    
    return line.trim();
}

// Find the containing function for a position
function findContainingFunction(position: number, functionInfoMap: Map<string, FunctionInfo>): string {
    let containingFunction = 'Unknown';
    let bestMatchLength = Number.MAX_SAFE_INTEGER;
    
    for (const [funcName, funcInfo] of functionInfoMap.entries()) {
        if (position >= funcInfo.startPos && position <= funcInfo.endPos) {
            // If multiple functions contain this position (nested functions),
            // use the one with the smallest scope
            const functionLength = funcInfo.endPos - funcInfo.startPos;
            if (functionLength < bestMatchLength) {
                bestMatchLength = functionLength;
                containingFunction = funcName;
            }
        }
    }
    
    return containingFunction;
}

/**
 * Main recursive search function
 */
export async function recursiveSearch(resultsViewProvider: SearchResultsViewProvider): Promise<{ searchTerm: string, results: SearchResult[] } | undefined> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor!');
        return undefined;
    }
    
    // Get the selected text and entire document text
    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    const entireDocumentText = editor.document.getText();
    
    if (!selectedText) {
        vscode.window.showErrorMessage('No text selected!');
        return undefined;
    }
    
    // Ask the user for the function or variable to search for
    const searchTarget = await vscode.window.showInputBox({
        prompt: 'Enter the text to search for',
        placeHolder: 'e.g., validateInput or console.log(...)'
    });
    
    if (!searchTarget) {
        return undefined;
    }
    
    // Build the call graph from the entire file
    const { callGraph, functionInfoMap } = buildCallGraph(entireDocumentText);
    
    // Extract imported functions
    const importedFunctions = extractImportedFunctions(entireDocumentText);
    
    // Find all functions in the selected text - improved detection
    const selectedFunctions = new Set<string>();
    
    // Detect traditional function declarations
    const traditionalFuncRegex = /function\s+([a-zA-Z0-9_$]+)\s*\(/g;
    let match;
    while ((match = traditionalFuncRegex.exec(selectedText)) !== null) {
        selectedFunctions.add(match[1]);
    }
    
    // Detect function calls within the selection
    const functionCallRegex = /\b([a-zA-Z0-9_$.]+)(?:\.[a-zA-Z0-9_$]+)?\s*\(/g;
    while ((match = functionCallRegex.exec(selectedText)) !== null) {
        const potentialFunctionName = match[1];
        
        // Check for direct function calls
        if (functionInfoMap.has(potentialFunctionName)) {
            selectedFunctions.add(potentialFunctionName);
        }
        
        // Check for imported functions
        if (importedFunctions.has(potentialFunctionName)) {
            const originalName = importedFunctions.get(potentialFunctionName);
            if (originalName) {
                // Add a comment to indicate it's an imported function
                const importNote = `Imported as ${potentialFunctionName}`;
                // ... handle imported function search ...
            }
        }
        
        // Check for method calls on imported modules
        const methodCallMatch = potentialFunctionName.match(/^([a-zA-Z0-9_$]+)\.([a-zA-Z0-9_$]+)$/);
        if (methodCallMatch) {
            const moduleName = methodCallMatch[1];
            const methodName = methodCallMatch[2];
            
            // ... handle module method calls ...
        }
    }

    // Detect variable assignments with function expressions
    const varFuncRegex = /\b(const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:function|\(.*\)\s*=>)/g;
    while ((match = varFuncRegex.exec(selectedText)) !== null) {
        selectedFunctions.add(match[2]);
    }
    
    // For each selected function, find all its nested calls
    const relevantFunctions = new Set<string>();
    for (const func of selectedFunctions) {
        relevantFunctions.add(func);
        
        // Find direct and indirect calls
        const nestedCalls = findNestedCalls(callGraph, func);
        for (const nestedCall of nestedCalls) {
            relevantFunctions.add(nestedCall);
        }
        
        // Explicitly check for any functions called directly in the selected text
        const directCallRegex = new RegExp(`\\b${func}\\s*\\(.*\\).*\\{[\\s\\S]*?\\b([a-zA-Z0-9_$]+)\\s*\\(`, 'g');
        while ((match = directCallRegex.exec(selectedText)) !== null) {
            const calledFunc = match[1];
            if (functionInfoMap.has(calledFunc)) {
                relevantFunctions.add(calledFunc);
                
                // Also add functions that this called function calls
                const secondaryNestedCalls = findNestedCalls(callGraph, calledFunc);
                for (const secondaryCall of secondaryNestedCalls) {
                    relevantFunctions.add(secondaryCall);
                }
            }
        }
    }
    
    // Highlight all occurrences of the target in the selection and related functions
    const decorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
        borderColor: new vscode.ThemeColor('editor.findMatchHighlightBorder')
    });
    
    const decorations: vscode.DecorationOptions[] = [];
    const searchResults: SearchResult[] = [];
    
    // Find matches directly within the selection
    const searchRegex = new RegExp(searchTarget, 'gi'); // Case insensitive search
    let searchMatch;
    
    // Look for matches within the selection
    while ((searchMatch = searchRegex.exec(selectedText)) !== null) {
        const selectionStartOffset = editor.document.offsetAt(selection.start);
        const startPos = editor.document.positionAt(selectionStartOffset + searchMatch.index);
        const endPos = editor.document.positionAt(selectionStartOffset + searchMatch.index + searchMatch[0].length);
        const range = new vscode.Range(startPos, endPos);
        
        decorations.push({ range });
        
        // Find the containing function using improved detection
        const absoluteMatchPosition = selectionStartOffset + searchMatch.index;
        const containingFunction = findContainingFunction(absoluteMatchPosition, functionInfoMap);
        
        searchResults.push({
            text: getTextLineForMatch(selectedText, searchMatch.index, searchMatch[0].length),
            lineNumber: startPos.line,
            functionName: containingFunction,
            range: range,
            isInSelection: true
        });
    }
    
    // Look for matches in content of related functions
    for (const funcName of relevantFunctions) {
        const funcInfo = functionInfoMap.get(funcName);
        if (funcInfo) {
            // Reset the regex for each function
            searchRegex.lastIndex = 0;
            
            while ((searchMatch = searchRegex.exec(funcInfo.content)) !== null) {
                const startPos = editor.document.positionAt(funcInfo.startPos + searchMatch.index);
                const endPos = editor.document.positionAt(funcInfo.startPos + searchMatch.index + searchMatch[0].length);
                const range = new vscode.Range(startPos, endPos);
                
                // Only add if it's not already in the selection
                if (!selection.contains(range) && !decorations.some(d => d.range.isEqual(range))) {
                    decorations.push({ range });
                    
                    searchResults.push({
                        text: getTextLineForMatch(funcInfo.content, searchMatch.index, searchMatch[0].length),
                        lineNumber: startPos.line,
                        functionName: funcName,
                        range: range,
                        isInSelection: false
                    });
                }
            }
        }
    }
    
    // Apply the decorations
    editor.setDecorations(decorationType, decorations);
    
    // Show results in the sidebar view
    resultsViewProvider.showResults(searchTarget, searchResults);
    
    // Display results summary
    vscode.window.showInformationMessage(
        `Found ${decorations.length} matches for "${searchTarget}" in selected and related functions`
    );
    
    // Return the results for the tree view
    return {
        searchTerm: searchTarget,
        results: searchResults
    };
} 