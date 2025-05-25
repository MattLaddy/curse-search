import * as vscode from 'vscode';
import { recursiveSearch } from './recursiveSearch';
import { SearchResultsViewProvider } from './searchResultsView';

export function activate(context: vscode.ExtensionContext): void {
    // Register search results view provider
    const searchResultsViewProvider = new SearchResultsViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            SearchResultsViewProvider.viewType, 
            searchResultsViewProvider
        )
    );

    // Register command
    context.subscriptions.push(
        vscode.commands.registerCommand('CurseSearch.recursiveSearch', () =>
            recursiveSearch(searchResultsViewProvider),
        )
    );
}

export function deactivate(): void {
    // recycle resource...
}
