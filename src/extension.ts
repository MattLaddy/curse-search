import * as vscode from 'vscode';
import { recursiveSearch } from './recursiveSearch';
import { SearchResultsViewProvider } from './searchResultsView';
import { SearchResultsTreeProvider } from './searchTreeProvider';

export function activate(context: vscode.ExtensionContext): void {
    console.log('Activating CurseSearch extension');
    
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
            try {
                console.log('Running recursive search command');
                const result = await recursiveSearch(searchResultsViewProvider);
                if (result) {
                    searchResultsTreeProvider.refresh(result.searchTerm, result.results);
                    
                    // Show the custom view container in the activity bar
                    await vscode.commands.executeCommand('workbench.view.extension.curse-search');
                }
            } catch (error) {
                console.error('Error in recursive search:', error);
                vscode.window.showErrorMessage(`Error in search: ${error}`);
            }
        })
    );
}

export function deactivate(): void {
    // recycle resource...
}
