const vscode = require('vscode');
const fs = require('fs');

let preamble = "";

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	console.log('Congratulations, your extension "texdown" is now active!');

	let disposable = vscode.commands.registerCommand('texdown.convert', async function () {

		// read text from open file
		let editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No file opened');
			return;
		}
		let text = editor.document.getText();
		// if text is empty, show error message and return
		if (text.length === 0) {
			vscode.window.showErrorMessage('No text to convert');
			return;
		}

		//parse
		text = parseBold(text);
		text = parseItalic(text);
		text = parseCodeSpan(text);

		// document syntax
		text = surroundWithMinimalTemplate(text);



		// write to file with .tex extension
		let fileName = editor.document.fileName;
		let fileNameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.'));
		let fileNameWithExtension = fileNameWithoutExtension + '.tex';
		fs.writeFile(fileNameWithExtension, text, function (err) {
			vscode.window.showErrorMessage(err.message);
		});

		// open newly created file
		vscode.workspace.openTextDocument(fileNameWithExtension).then(doc => {
			vscode.window.showTextDocument(doc);
		});
	});

	context.subscriptions.push(disposable);
}

function deactivate() { }

module.exports = {
	activate,
	deactivate
}

// utility functions
let parseBold = (text) => {
	// get regex for **<sometext>**
	let bold = /[\*\_][\*\_](.*?)[\*\_][\*\_]/gs;
	// match regex
	let matches = text.match(bold);
	// replace regex with \\textbf{<sometext>}
	if (matches !== null)
		for (let i = 0; i < matches.length; i++) {
			let match = matches[i];
			let replacement = '\\textbf{' + match.substring(2, match.length - 2) + '}';
			text = text.replace(match, replacement);
		}
	return text;
}

let parseItalic = (text) => {
	// get regex for **<sometext>**
	let italic = /[\*\_](.*?)[\*\_]/gs;
	// match regex
	let matches = text.match(italic);
	// replace regex with \\textbf{<sometext>}
	if (matches !== null)
		for (let i = 0; i < matches.length; i++) {
			let match = matches[i];
			let replacement = '\\textit{' + match.substring(1, match.length - 1) + '}';
			text = text.replace(match, replacement);
		}
	return text;
}

let parseCodeSpan = (text) => {
	// get regex for **<sometext>**
	let code = /`(.*?)`/g;
	// match regex
	let matches = text.match(code);
	// replace regex with \\textbf{<sometext>}
	if (matches !== null) {
		for (let i = 0; i < matches.length; i++) {
			let match = matches[i];
			let replacement = '\\lstin{' + match.substring(1, match.length - 1) + '}';
			text = text.replace(match, replacement);
		}
		preamble += `\\usepackage{xcolor}                                     % Color
\\usepackage{listings}                                   % Sourcecode Pretty printing
    \\lstset{
		stringstyle = \\ttfamily, numbers = left, basicstyle = \\small, numberstyle = \\ttfamily, breaklines, breakatwhitespace,
		keywordstyle = \\color{violet}, commentstyle = \\color{cyan},
		showspaces = false, showstringspaces = false, showtabs = true,
		frame = single, frameround = tttt, backgroundcolor = \\color{gray!40}, fillcolor = \\color{white}
	}
	\\newcommand*\\lstin{\\lstinline[columns=fixed]}`;
	}
	return text;
}

let surroundWithMinimalTemplate = (text) => {
	preamble += "\\usepackage[utf8]{inputenc}\n";

	let doc = `\\documentclass[12pt]{article}

${preamble}

\\begin{document}
${text}
\\end{document}
`;
	return doc;
}