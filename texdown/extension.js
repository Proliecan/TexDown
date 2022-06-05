const vscode = require('vscode');
const fs = require('fs');

let preamble = "";
let maketitle = false;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	console.log('Congratulations, your extension "texdown" is now active!');

	let disposable = vscode.commands.registerCommand('texdown.convert', async function () {
		// read text from open file
		let editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No *.md file opened');
			return;
		}
		let text = editor.document.getText();
		// if text is empty, show error message and return
		if (text.length === 0) {
			vscode.window.showErrorMessage('No text to convert');
			return;
		}

		// clear praemble
		preamble = "";
		maketitle = false;

		// convert text to LF line endings
		text = text.replace(/\r\n/g, '\n');

		//parse
		text = parseBold(text);
		text = parseItalic(text);
		text = parseCode(text);
		text = parseTitle(text);
		text = parseHeadings(text);

		// document syntax
		if (maketitle) {
			// add \\maketitle as first line to text
			text = '\\maketitle\n' + text;
		}
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

// UTITLITY FUNCTIONS
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

let parseCode = (text) => {

	// parse inline code
	let inline = parseInlineCode(text);
	text = inline[1];

	// parse indented code blocks
	let indented = parseIndentedCode(text);
	text = indented[1];

	if (inline[0] === true || indented[0] === true) {
		// add preamble
		preamble += `\\usepackage{xcolor}                                     % Color
\\usepackage{listings}                                   % Sourcecode Pretty printing
    \\lstset{
		stringstyle = \\ttfamily, numbers = left, basicstyle = \\small, numberstyle = \\ttfamily, breaklines, breakatwhitespace,
		keywordstyle = \\color{violet}, commentstyle = \\color{cyan},
		showspaces = false, showstringspaces = false, showtabs = true,
		frame = single, frameround = tttt, backgroundcolor = \\color{gray!40}, fillcolor = \\color{white}
	}\n`;
	}
	if (inline[0] === true) {
		preamble += `	\\newcommand*\\lstinl{\\lstinline[columns=fixed]}`;


	}
	return text;
}

/*
* @param {string} text
* @returns {array} [(bool)changed text, (string)text]
*/
let parseInlineCode = (text) => {
	// get regex for **<sometext>**
	let inlineRegex = /`(.*?)`/g;
	// match regex
	let inline = text.match(inlineRegex);


	// replace regex with code
	if (inline !== null) {
		for (let i = 0; i < inline.length; i++) {
			let match = inline[i];
			let replacement = '\\lstinl{' + match.substring(1, match.length - 1) + '}';
			text = text.replace(match, replacement);
		}
	}

	return [inline !== null, text];
}

/*
* @param {string} text
* @returns {array} [(bool)changed text, (string)text]
*/
let parseIndentedCode = (text) => {
	// find first line that begins with four whitespace caracters and follows two newlines
	let regex = /\n\s*\n\s{4}(.*?)\n{2}/gs;
	let matches = text.match(regex);
	if (matches !== null) {
		for (let i = 0; i < matches.length; i++) {
			let match = matches[i];
			// split match into lines
			let lines = match.split('\n');
			let codeBlock = '';
			let trail = '';
			for (let j = 0; j < lines.length; j++) {
				let line = lines[j];
				// is line empty or only whitespace?
				if (line.length === 0 || /^\s*$/.test(line))
					continue;

				// if line does not start with four whitespace characters the code block ends here
				if (!/^\s{4}/.test(line)){
					// add this line all following lines to the trail
					for (let k = j; k < lines.length; k++) {
						trail += lines[k] + '\n';
					}
					break;
				}

				// remove four whitespace characters
				line = line.substring(4);
				// remove only trailing whitespace
				line = line.replace(/\s*$/, '');
				// add line to codeBlock
				codeBlock += line + '\n';
			}
			// remove leading and training newlines
			codeBlock = codeBlock.trim();

			// replace match with code block
			let replacement = '\n\\begin{lstlisting}\n' + codeBlock + '\n\\end{lstlisting}\n';
			replacement += trail;
			text = text.replace(match, replacement);
		}
	}

	return [matches !== null, text];
}

let parseTitle = (text) => {
	// get first line of text
	let firstLine = text.split('\n')[0];
	// get regex for #<sometext>
	let titleRegex = /^#(.*)$/;
	if (titleRegex.test(firstLine)) {
		// get title
		let title = firstLine.match(titleRegex)[1];
		// remove line from text
		text = text.replace(firstLine, '');
		// add title to preamble
		preamble += '\\title{' + title + '}\n';
		maketitle = true;
	}
	return text;
}

let parseHeadings = (text) => {
	// get all lines in text with markdown heading
	let regex = /^(#+)\s(.*)$/gm;
	let matches = text.match(regex);
	if (matches !== null) {
		for (let i = 0; i < matches.length; i++) {
			let match = matches[i];
			// get level of markdown heading by counting #
			let level = match.match(/^#+/)[0].length;
			// remove # from match
			let headingText = match.replace(/^#+/, '');
			// replace line with LaTeX section of right level
			switch (level) {
				case 1:
					headingText = '\n\\section{' + headingText + '}';
					break;
				case 2:
					headingText = '\n\\subsection{' + headingText + '}';
					break;
				case 3:
					headingText = '\n\\subsubsection{' + headingText + '}';
					break;
				case 4:
					headingText = '\n\\paragraph{' + headingText + '}';
					break;
				case 5:
					headingText = '\n\\subparagraph{' + headingText + '}';
					break;
				default:
					headingText = '\n\\noindent\n\\\\\\textbf{' + headingText + '}';
					break;
			}
			// replace line with LaTeX section
			text = text.replace(match, headingText);
		}
	}
	return text;
}

// template
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