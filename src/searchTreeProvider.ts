import * as vscode from 'vscode';
import * as path from 'path';

export class SearchResultItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly resourceUri?: vscode.Uri,
        public readonly command?: vscode.Command,
        public readonly contextValue?: string
    ) {
        super(label, collapsibleState);
    }
}

export class FunctionResultItem extends SearchResultItem {
    constructor(
        public readonly functionName: string,
        public readonly count: number
    ) {
        super(
            `${functionName} (${count})`,
            vscode.TreeItemCollapsibleState.Expanded
        );
        this.contextValue = 'function';
        this.iconPath = new vscode.ThemeIcon('symbol-function');
    }
}

export class LineResultItem extends SearchResultItem {
    constructor(
        public readonly text: string,
        public readonly lineNumber: number,
        public readonly range: vscode.Range,
        public readonly resourceUri: vscode.Uri,
        public readonly isInSelection: boolean
    ) {
        super(
            `Line ${lineNumber + 1}: ${text}`,
            vscode.TreeItemCollapsibleState.None,
            resourceUri,
            {
                command: 'curseSearch.revealLine',
                title: 'Go to Line',
                arguments: [resourceUri, range]
            }
        );
        this.contextValue = 'line';
        
        // Different icon based on whether it's in selection or not
        this.iconPath = isInSelection 
            ? new vscode.ThemeIcon('selection', new vscode.ThemeColor('editor.selectionBackground'))
            : new vscode.ThemeIcon('search', new vscode.ThemeColor('editor.findMatchHighlightBackground'));
        
        this.description = isInSelection ? 'in selection' : 'in related function';
        
        // Add line number to the tooltip
        this.tooltip = `${text} (Line ${lineNumber + 1})`;
    }
}

export interface SearchResult {
    text: string;
    lineNumber: number;
    functionName: string;
    range: vscode.Range;
    isInSelection: boolean;
}

export class SearchResultsTreeProvider implements vscode.TreeDataProvider<SearchResultItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SearchResultItem | undefined | null | void> = new vscode.EventEmitter<SearchResultItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SearchResultItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private results: SearchResult[] = [];
    private searchTerm: string = '';
    private currentFileUri: vscode.Uri | undefined;

    constructor() {}

    refresh(searchTerm: string, results: SearchResult[]): void {
        this.searchTerm = searchTerm;
        this.results = results;
        this.currentFileUri = vscode.window.activeTextEditor?.document.uri;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: SearchResultItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: SearchResultItem): Thenable<SearchResultItem[]> {
        if (!this.results.length) {
            return Promise.resolve([]);
        }

        if (!element) {
            // Root level - show search information and function groups
            const items: SearchResultItem[] = [];
            
            // Add search info
            const searchInfoItem = new SearchResultItem(
                `Found ${this.results.length} matches for "${this.searchTerm}"`,
                vscode.TreeItemCollapsibleState.None
            );
            searchInfoItem.iconPath = new vscode.ThemeIcon('search');
            items.push(searchInfoItem);
            
            // Group by function
            const functionGroups = new Map<string, SearchResult[]>();
            for (const result of this.results) {
                if (!functionGroups.has(result.functionName)) {
                    functionGroups.set(result.functionName, []);
                }
                functionGroups.get(result.functionName)?.push(result);
            }
            
            // Add function items
            for (const [functionName, results] of functionGroups.entries()) {
                items.push(new FunctionResultItem(functionName, results.length));
            }
            
            return Promise.resolve(items);
        } else if (element instanceof FunctionResultItem) {
            // Function level - show line items for this function
            const functionResults = this.results.filter(r => r.functionName === element.functionName);
            return Promise.resolve(
                functionResults.map(result => 
                    new LineResultItem(
                        result.text, 
                        result.lineNumber, 
                        result.range, 
                        this.currentFileUri!, 
                        result.isInSelection
                    )
                )
            );
        }
        
        return Promise.resolve([]);
    }
} 