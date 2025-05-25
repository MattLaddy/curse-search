import * as vscode from 'vscode';

export interface SearchResult {
    text: string;
    lineNumber: number;
    functionName: string;
    range: vscode.Range;
    isInSelection: boolean;
}

export class SearchResultsViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'curseSearch.resultsView';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'jumpToResult':
                        this._jumpToResult(message.range);
                        return;
                }
            }
        );
    }

    public showResults(searchTerm: string, results: SearchResult[]) {
        if (this._view) {
            this._view.show(true);
            this._view.webview.postMessage({
                command: 'showResults',
                searchTerm,
                results: results.map(r => ({
                    text: r.text,
                    lineNumber: r.lineNumber,
                    functionName: r.functionName,
                    range: {
                        start: { line: r.range.start.line, character: r.range.start.character },
                        end: { line: r.range.end.line, character: r.range.end.character }
                    },
                    isInSelection: r.isInSelection
                }))
            });
        }
    }

    private _jumpToResult(rangeData: any) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        const range = new vscode.Range(
            new vscode.Position(rangeData.start.line, rangeData.start.character),
            new vscode.Position(rangeData.end.line, rangeData.end.character)
        );

        editor.selection = new vscode.Selection(range.start, range.end);
        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return /*html*/`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    padding: 0;
                    margin: 0;
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                }
                .container {
                    padding: 10px;
                }
                h3 {
                    margin: 0 0 10px 0;
                    font-weight: normal;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 5px;
                }
                .results {
                    margin-top: 10px;
                }
                .result-item {
                    margin-bottom: 10px;
                    cursor: pointer;
                    padding: 5px;
                    border-radius: 3px;
                }
                .result-item:hover {
                    background-color: var(--vscode-list-hoverBackground);
                }
                .line-number {
                    color: var(--vscode-editorLineNumber-foreground);
                    margin-right: 5px;
                    min-width: 40px;
                    display: inline-block;
                    text-align: right;
                }
                .function-name {
                    font-weight: bold;
                    margin-bottom: 2px;
                    color: var(--vscode-symbolIcon-functionForeground);
                }
                .highlight {
                    background-color: var(--vscode-editor-findMatchHighlightBackground);
                    border: 1px solid var(--vscode-editor-findMatchHighlightBorder);
                    border-radius: 2px;
                    padding: 0 2px;
                }
                .text-content {
                    word-break: break-all;
                    white-space: pre-wrap;
                    font-family: var(--vscode-editor-font-family);
                    font-size: var(--vscode-editor-font-size);
                }
                .in-selection {
                    background-color: var(--vscode-editor-selectionBackground);
                    opacity: 0.7;
                    border-left: 2px solid var(--vscode-editor-selectionHighlightBorder);
                }
                .no-results {
                    font-style: italic;
                    color: var(--vscode-disabledForeground);
                    margin-top: 10px;
                }
                .count {
                    font-size: 0.9em;
                    color: var(--vscode-descriptionForeground);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h3>Search Results</h3>
                <div id="results" class="results">
                    <div class="no-results">No search performed yet</div>
                </div>
            </div>

            <script>
                (function() {
                    const vscode = acquireVsCodeApi();
                    const resultsContainer = document.getElementById('results');

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.command) {
                            case 'showResults':
                                showResults(message.searchTerm, message.results);
                                break;
                        }
                    });

                    function showResults(searchTerm, results) {
                        resultsContainer.innerHTML = '';
                        
                        if (results.length === 0) {
                            resultsContainer.innerHTML = '<div class="no-results">No results found</div>';
                            return;
                        }

                        // Group by function
                        const groupedResults = {};
                        for (const result of results) {
                            if (!groupedResults[result.functionName]) {
                                groupedResults[result.functionName] = [];
                            }
                            groupedResults[result.functionName].push(result);
                        }

                        const header = document.createElement('div');
                        header.classList.add('count');
                        header.textContent = \`Found \${results.length} matches for "\${searchTerm}"\`;
                        resultsContainer.appendChild(header);

                        for (const functionName in groupedResults) {
                            const funcResults = groupedResults[functionName];
                            
                            const functionHeader = document.createElement('div');
                            functionHeader.classList.add('function-name');
                            functionHeader.textContent = functionName;
                            resultsContainer.appendChild(functionHeader);
                            
                            for (const result of funcResults) {
                                const resultItem = document.createElement('div');
                                resultItem.classList.add('result-item');
                                if (result.isInSelection) {
                                    resultItem.classList.add('in-selection');
                                }
                                
                                const lineNumber = document.createElement('span');
                                lineNumber.classList.add('line-number');
                                lineNumber.textContent = \`Line \${result.lineNumber + 1}:\`;
                                
                                const textContent = document.createElement('span');
                                textContent.classList.add('text-content');
                                
                                // Simple highlighting by splitting on searchTerm
                                const parts = result.text.split(new RegExp(searchTerm, 'i'));
                                let reconstructedText = '';
                                
                                for (let i = 0; i < parts.length; i++) {
                                    reconstructedText += parts[i];
                                    
                                    // Add highlight span between parts (except after the last part)
                                    if (i < parts.length - 1) {
                                        // Find the match to preserve its case
                                        const matchStartIndex = reconstructedText.length;
                                        const matchText = result.text.substr(matchStartIndex, searchTerm.length);
                                        reconstructedText += \`<span class="highlight">\${matchText}</span>\`;
                                    }
                                }
                                
                                textContent.innerHTML = reconstructedText;
                                
                                resultItem.appendChild(lineNumber);
                                resultItem.appendChild(textContent);
                                
                                resultItem.addEventListener('click', () => {
                                    vscode.postMessage({
                                        command: 'jumpToResult',
                                        range: result.range
                                    });
                                });
                                
                                resultsContainer.appendChild(resultItem);
                            }
                        }
                    }
                }());
            </script>
        </body>
        </html>`;
    }
} 