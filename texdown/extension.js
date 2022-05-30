const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	console.log('Congratulations, your extension "texdown" is now active!');

	let disposable = vscode.commands.registerCommand('texdown.convert', async function() {
		
		// read text from open file
		let editor = vscode.window.activeTextEditor;
		if (!editor) return;
		let text = editor.document.getText();

		text = parseBold(text);

		// write text to new file with .tex extension
		let newFile = vscode.Uri.parse('untitled:' + editor.document.fileName + '.tex');
		let newEditor = vscode.window.showTextDocument(newFile);
		(await newEditor).edit(edit => {
			edit.insert(new vscode.Position(0, 0), text);
		});
	});

	context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}

// utility functions
let parseBold = (text) => {
	// get regex for **<sometext>**
	let bold = /\*\*(.*?)\*\*/g;
	// match regex
	let matches = text.match(bold);
	// replace regex with \\textbf{<sometext>}
	for (let i = 0; i < matches.length; i++) {
		let match = matches[i];
		let replacement = '\\textbf{' + match.substring(2, match.length - 2) + '}';
		text = text.replace(match, replacement);
	}
	return text;
}
