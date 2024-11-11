import { workspace, ExtensionContext, window, commands } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions
} from 'vscode-languageclient/node';
import { getSpagoWorkspacePath, updateOutputPath, updateSourceGlobs } from './spago';

let client: LanguageClient;

export async function activate(context: ExtensionContext) {
  const name = 'purescript-lsp';
  await updateOutputPath();
  const outputDirectory: string | undefined = workspace.getConfiguration('purescript-lsp').get('outputPath');
  const useSpago = workspace.getConfiguration('purescript-lsp-client').get('use-spago-output-path') || false;

  const workingDirectory = useSpago ? (await getSpagoWorkspacePath()) : undefined;
  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    command: "purs",
    args: ["lsp", "server",
      "--directory", workingDirectory || "./",
      "--output-directory", outputDirectory || "./output",
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
  context.subscriptions.push(commands.registerCommand('purescript-lsp.create-index-tables', () => {
    client.sendRequest('create-index-tables');
  }));
  context.subscriptions.push(commands.registerCommand('purescript-lsp.drop-index-tables', () => {
    client.sendRequest('drop-index-tables');
  }));
  context.subscriptions.push(commands.registerCommand('purescript-lsp.debug-cache-size', () => {
    client.sendRequest('debug-cache-size');
  }));

  // Start the client. This will also launch the server
  await client.start();

  // Update the source globs from spago if necessary. We do this after the client has started as it may be slow
  await updateSourceGlobs();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
