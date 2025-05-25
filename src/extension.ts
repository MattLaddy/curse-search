import * as vscode from 'vscode';
import { recursiveSearch } from './recursiveSearch';
import { SearchResultsViewProvider } from './searchResultsView';
import { SearchResultsTreeProvider, SearchResult } from './searchTreeProvider';

export function activate(context: vscode.ExtensionContext): void {
    // Register search results view provider (WebView)
    const searchResultsViewProvider = new SearchResultsViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            SearchResultsViewProvider.viewType, 
            searchResultsViewProvider
        )
    );

    // Register search results tree view provider (Explorer view)
    const searchResultsTreeProvider = new SearchResultsTreeProvider();
    const treeView = vscode.window.createTreeView('curseSearchResults', {
        treeDataProvider: searchResultsTreeProvider,
        showCollapseAll: true
    });
    context.subscriptions.push(treeView);

    // Register command to reveal line
    context.subscriptions.push(
        vscode.commands.registerCommand('curseSearch.revealLine', (uri: vscode.Uri, range: vscode.Range) => {
            vscode.window.showTextDocument(uri, {
                selection: range,
                preview: true
            });
        })
    );

    // Register search command
    context.subscriptions.push(
        vscode.commands.registerCommand('CurseSearch.recursiveSearch', async () => {
            const result = await recursiveSearch(searchResultsViewProvider);
            if (result) {
                searchResultsTreeProvider.refresh(result.searchTerm, result.results);
            }
        })
    );
}

export function deactivate(): void {
    // recycle resource...
}
