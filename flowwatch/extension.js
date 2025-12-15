const vscode = require('vscode');
const { connectWebSocket } = require('./src/websocket');
const { lockFile, unlockFile } = require('./src/api');

let currentFile = null;
let statusBar;
let lockDecoration;
let isLockedByAnotherUser = false;

function createLockDecoration() {
	lockDecoration = vscode.window.createTextEditorDecorationType({
		isWholeLine: true,
		backgroundColor: 'rgba(255,0,0,0.08)',
		border: '1px solid rgba(255,0,0,0.4)',
		after: {
			contentText: ' 🔒 Arquivo bloqueado',
			color: '#ff5555',
			margin: '0 0 0 1em'
		}
	});
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	console.log('FlowWatch activated');
	createLockDecoration();
	connectWebSocket();

	statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
	statusBar.show();

	vscode.window.onDidChangeActiveTextEditor(async (editor) => {
		if(!editor){
			return;
		}

		const filePath = editor.document.uri.fsPath;

		if(currentFile && currentFile !== filePath  && !isLockedByAnotherUser){
			await unlockFile(currentFile);
		}

		currentFile = filePath;
		isLockedByAnotherUser = false;

		try {
			await lockFile(filePath);
			statusBar.text = "Arquivo bloqueado";
			editor.setDecorations(lockDecoration, []);
		} catch (error) {
			isLockedByAnotherUser = true;
			console.error("Erro ao bloquear o arquivo:", error);
			const user = error.response.data.lockedBy || "outro desenvolvedor";
			const date = error.response.data.timestamp ? `(há ${formatTime(error.response.data.timestamp)})` : "";
			statusBar.text = `Em uso por ${user}${date}`;
			editor.setDecorations(lockDecoration, [new vscode.Range(editor.document.positionAt(0),
			editor.document.positionAt(editor.document.getText().length))]);
			vscode.window.showWarningMessage(`O arquivo está sendo usado por ${user}${date}. Edição não permitida.`);
		}
	});

	vscode.workspace.onDidChangeTextDocument(async (event) => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) return;

		const filePath = editor.document.uri.fsPath;

		if (isLockedByAnotherUser && filePath === currentFile) {
			vscode.commands.executeCommand('workbench.action.files.revert');

			vscode.window.setStatusBarMessage(
				"🔒 Arquivo bloqueado - edição não permitida",
				2000
			);
		}
	});

	context.subscriptions.push(statusBar);
}

function formatTime(timestamp) {
	const diff = Date.now() - timestamp;
	const minutes = Math.floor(diff / 60000);

	if(minutes < 1){
		return "agora";
	}

	if(minutes === 1){
		return "1 min";
	}
	return `${minutes} min`;
}

async function deactivate() {
	if(currentFile && !isLockedByAnotherUser){
		await unlockFile(currentFile);
	}
}

module.exports = {
	activate,
	deactivate
}
