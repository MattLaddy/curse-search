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
                if (currentFunction && path.node.callee.type === 'Identifier') {
                    const calledFunction = path.node.callee.name;
                    const currentFunctionCalls = callGraph.get(currentFunction);
                    if (currentFunctionCalls) {
                        currentFunctionCalls.add(calledFunction);
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

/**
 * Main recursive search function
 */
export async function recursiveSearch(resultsViewProvider: SearchResultsViewProvider) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor!');
        return;
    }
    
    // Get the selected text and entire document text
    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    const entireDocumentText = editor.document.getText();
    
    if (!selectedText) {
        vscode.window.showErrorMessage('No text selected!');
        return;
    }
    
    // Ask the user for the function or variable to search for
    const searchTarget = await vscode.window.showInputBox({
        prompt: 'Enter the text to search for',
        placeHolder: 'e.g., validateInput or console.log(...)'
    });
    
    if (!searchTarget) {
        return;
    }
    
    // Build the call graph from the entire file
    const { callGraph, functionInfoMap } = buildCallGraph(entireDocumentText);
    
    // Find all functions that the selected functions call (directly or indirectly)
    const selectedFunctions = new Set<string>();
    const selectedFunctionRegex = /function\s+([a-zA-Z0-9_$]+)\s*\(/g;
    let match;
    
    while ((match = selectedFunctionRegex.exec(selectedText)) !== null) {
        selectedFunctions.add(match[1]);
    }
    
    // For each selected function, find all its nested calls
    const relevantFunctions = new Set<string>();
    for (const func of selectedFunctions) {
        relevantFunctions.add(func);
        const nestedCalls = findNestedCalls(callGraph, func);
        for (const nestedCall of nestedCalls) {
            relevantFunctions.add(nestedCall);
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
        
        // Find the containing function
        let containingFunction = 'Unknown';
        for (const [funcName, funcInfo] of functionInfoMap.entries()) {
            if (selectedText.includes(funcName) && selectedFunctions.has(funcName)) {
                containingFunction = funcName;
                break;
            }
        }
        
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
} 