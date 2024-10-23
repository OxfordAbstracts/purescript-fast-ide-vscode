import { exec } from "child_process";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { normalize, join } from "path";
import { cwd } from "process";
import { promisify } from "util";
import { ConfigurationTarget, workspace } from "vscode";
import { parse } from 'yaml';

const execP = promisify(exec);


const readSpagoYaml = async (path: string): Promise<any> => {
  const spagoSrc = await readFile(`${path}/spago.yaml`, 'utf8');
  try {
    return parse(spagoSrc);
  } catch (err) {
    console.error('readSpagoYaml error', err);
    return;
  }
};

export const getCurrentDir = (): string | undefined => {
  const workspaceFolders = workspace.workspaceFolders;
  if (!workspaceFolders) {
    return;
  }
  const workspaceFolder = workspaceFolders[0];
  return workspaceFolder.uri.fsPath;
};

const pTrue = () => Promise.resolve(true);

const getSpagoPath = async (path: string, pred: (x: any) => Promise<boolean> = pTrue, depth: number = 8): Promise<string | undefined> => {
  if (depth === 0) {
    return Promise.resolve(undefined);
  }

  if (hasSpagoYaml(path)) {
    const normalizedPath = normalize(path);
    const passesPred = await pred(normalizedPath);
    if (passesPred) {
      return Promise.resolve(normalizedPath);
    }
  }
  return getSpagoPath(`${path}/..`, pred, depth - 1);
};

const hasWorkspace = async (spagoPath: string): Promise<boolean> => {
  const spago = await readSpagoYaml(spagoPath);
  return Boolean(spago?.workspace);
};

export const getSpagoWorkspacePath = () => getSpagoPath(getCurrentDir() || cwd(), hasWorkspace);

const hasSpagoYaml = (path: string): boolean => existsSync(`${path}/spago.yaml`);

export const updateOutputPath = async (): Promise<undefined> => {
  const useSpago: boolean = workspace.getConfiguration('purescript-lsp-client').get('use-spago-output-path') || false;
  if (!useSpago) {
    return;
  }
  const currentDir = getCurrentDir();
  if (!currentDir) {
    return;
  }
  const spagoPath = await getSpagoPath(currentDir, hasWorkspace);
  if (!spagoPath) {
    return;
  }
  const yaml = await readSpagoYaml(spagoPath);

  const spagoOutputPath = yaml?.workspace?.buildOpts?.output || 'output';

  const currentOutput = workspace.getConfiguration('purescript-lsp').get('outputPath');

  if (currentOutput !== spagoOutputPath) {
    workspace.getConfiguration('purescript-lsp').update('outputPath', spagoOutputPath, ConfigurationTarget.Workspace);
  }
};

export const updateSourceGlobs = async (): Promise<undefined> => {
  const useSpago: boolean = workspace.getConfiguration('purescript-lsp-client').get('use-spago-sources') || false;
  if (!useSpago) {
    return;
  }
  const currentDir = getCurrentDir();
  if (!currentDir) {
    return;
  }

  const workspacePath = await getSpagoPath(currentDir, hasWorkspace);

  if (!workspacePath) {
    return;
  }

  const spagoPath = await getSpagoPath(currentDir);

  if (!spagoPath) {
    return;
  }

  const yaml = await readSpagoYaml(spagoPath);

  const packageName = yaml?.package?.name;
  let sources;
  if (packageName) {
    const { stdout } = await execP(`cd ${workspacePath} && spago sources -p ${packageName} --json`);
    sources = stdout;
  } else {
    const { stdout } = await execP(`cd ${workspacePath} && spago sources --json`);
    sources = stdout;
  }

  const currentSourceGlobs = workspace.getConfiguration('purescript-lsp').get('globs');

  if (JSON.stringify(currentSourceGlobs) !== sources) {
    workspace.getConfiguration('purescript-lsp').update('globs', JSON.parse(sources), ConfigurationTarget.Workspace);
  }

};