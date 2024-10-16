import { workspace, ExtensionContext, window, commands } from 'vscode';
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions
} from 'vscode-languageclient/node';
let client: LanguageClient;

export async function activate(context: ExtensionContext) {
	const name = 'purescript';
	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	const serverOptions: ServerOptions = {
		command: "purs",
		args: ["lsp", "server" , 
      "--output-directory", "./output",
    ],
	};

	const outputChannel = window.createOutputChannel(name);

	// Options to control the language client
	const clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [
			{
				scheme: 'file',
				language: 'purescript',
				pattern: '**/*.purs'
			}],

		synchronize: {
			configurationSection: 'purescript-lsp',
			fileEvents:
				[
					workspace.createFileSystemWatcher('**/*.purs'),
					workspace.createFileSystemWatcher('**/*.js')
				]
		},
    outputChannel,
		diagnosticCollectionName: name,
		outputChannelName: name,
		diagnosticPullOptions:
		{
			onChange: false,
			onSave: true,
		}
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'purescript-lsp',
		name,
		serverOptions,
		clientOptions
	);

	context.subscriptions.push(commands.registerCommand('purescript-lsp.build', () => {
		client.sendRequest('build');
	}));
	context.subscriptions.push(commands.registerCommand('purescript-lsp.clear-cache', () => {
		client.sendRequest('clear-cache');
	}));
	context.subscriptions.push(commands.registerCommand('purescript-lsp.clear-cache:exports', () => {
		client.sendRequest('clear-cache:exports');
	}));
	context.subscriptions.push(commands.registerCommand('purescript-lsp.clear-cache:rebuilds', () => {
		client.sendRequest('clear-cache:rebuilds');
	}));
	context.subscriptions.push(commands.registerCommand('purescript-lsp.delete-output', () => {
		client.sendRequest('delete-output');
	}));
	context.subscriptions.push(commands.registerCommand('purescript-lsp.index-fast', () => {
		client.sendRequest('index-fast');
	}));
	context.subscriptions.push(commands.registerCommand('purescript-lsp.index-full', () => {
		client.sendRequest('index-full');
	}));

	// Start the client. This will also launch the server
	await client.start();
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
