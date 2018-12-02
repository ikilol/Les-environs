// var socket;
let files;
let appControl, keysControl;
let superColliderEditor, javaScriptEditor;
let superColliderConsole, javaScriptConsole;
let currentLoadedFiles = {
    scd: null,
    js: null
};
window.onload = init;

function init() {
    var superColliderEditorContainer = document.getElementById("supercollider-editor");
    superColliderEditor = CodeMirror.fromTextArea(superColliderEditorContainer, {
        lineNumbers: false,
        mode: "sc",
        matchBrackets: true,
        autofocus: true,
        styleActiveLine: true,
        smartIndent: false,
        indentWithTabs: false,
        indentUnit: 4,
        lineWrapping: true,
        theme: "les-environs",
        autoCloseBrackets: true,
        scrollbarStyle: "null",
        styleSelectedText: true
    });

    var curWord = "";

    superColliderEditor.on("cursorActivity", function(editor) {

        var A1 = editor.getCursor().line;
        var A2 = editor.getCursor().ch;

        var B1 = editor.findWordAt({ line: A1, ch: A2 }).anchor.ch;
        var B2 = editor.findWordAt({ line: A1, ch: A2 }).head.ch;

        curWord = editor.getRange({ line: A1, ch: B1 }, { line: A1, ch: B2 });

        var openBracket = "(";
        var closeBracket = ")";
        var curLine = editor.getCursor().line;
        var lineNow = curLine;
        var curLineContent;
        var checkOpen = 1;
        var bracketCount = 0;

        curLineContent = String(editor.getLine(curLine));
        checkClose = curLineContent.localeCompare(closeBracket);
        if (checkClose === 0) {
            bracketCount += 1;
            while (lineNow > 0) {
                lineNow = lineNow - 1;
                curLineContent = String(editor.getLine(lineNow));
                checkOpen = curLineContent.localeCompare(openBracket);
                checkClose = curLineContent.localeCompare(closeBracket);
                if (checkOpen === 0) {
                    bracketCount -= 1;
                } else if (checkClose === 0) {
                    bracketCount += 1;
                }
                if (bracketCount === 0) break;
            }

            for (var i = lineNow; i < curLine; i++) {
                editor.addLineClass(i, 'background', 'CodeMirror-activeline-background');
            }
        } else {
            for (var i = 0; i < lineNow; i++) {
                editor.removeLineClass(i, 'background', 'CodeMirror-activeline-background');
            }
        }
    });

    superColliderEditor.setOption("extraKeys", {
        'Cmd-Enter': function() { runsel(); },
        'Cmd-.': function() { interpret('CmdPeriod.run;'); },
        'Cmd-Alt-/': "toggleComment",
        'Shift-Enter': function() { runLine(); },
        Tab: (cm) => cm.execCommand("indentMore"),
        "Shift-Tab": (cm) => cm.execCommand("indentLess"),
        'Cmd-Alt-0': (cm) => cm.execCommand("indentMore"),
        'Cmd-Alt-9': (cm) => cm.execCommand("indentLess")
    });

    function interpret(data) {
        socket.emit('interpretSuperCollider', data);
    }

    function runLine() {
        var curLine = superColliderEditor.getCursor().line;
        let line = String(superColliderEditor.getLine(curLine));
        socket.emit('interpretSuperCollider', line);
    }

    function runsel() {
        var selection = superColliderEditor.getSelection();
        let nonEmptySelection = selection.match(/.*?/g);
        if (selection !== '' && nonEmptySelection[0]) {
            interpret(selection);
        } else {

            var openBracket = "(";
            var closeBracket = ")";
            var curLine = superColliderEditor.getCursor().line;
            var lineNow = curLine;
            var lineRem = lineNow;
            var codeBracket = "";
            var curLineContent;
            var checkOpen = 1;
            var checkClose = 1;
            var countBrackets = 0;
            var countBracketsClose = 0;
            var bracketFound = 0;

            while (lineNow > 0) {
                lineNow = lineNow - 1;
                curLineContent = String(superColliderEditor.getLine(lineNow));

                checkClose = curLineContent.localeCompare(closeBracket);
                if (checkClose === 0) {
                    countBracketsClose += 1;
                }

                checkOpen = curLineContent.localeCompare(openBracket);
                if (checkOpen === 0) {
                    bracketFound = 1;
                    if (countBracketsClose === 0) {
                        countBrackets += 1;
                        lineRem = lineNow + 1;
                    } else {
                        countBracketsClose -= 1;
                    }
                }
            }

            lineNow = lineRem;
            if (bracketFound !== 0 && countBrackets > 0) {
                while (countBrackets !== 0) {
                    checkClose = String(superColliderEditor.getLine(lineNow)).localeCompare(closeBracket)
                    if (checkClose === 0 && lineNow >= curLine) {
                        countBrackets -= 1;
                    }
                    checkOpen = String(superColliderEditor.getLine(lineNow)).localeCompare(openBracket)
                    if (checkOpen === 0 && lineNow >= curLine) {
                        countBrackets += 1;
                    }
                    if (countBrackets === 0) break;

                    codeBracket += String(superColliderEditor.getLine(lineNow));
                    lineNow += 1;
                }
                // This transforms all single line comments into multi line comments
                // so that they work with the interpreter.
                // let r = /(\/{2})(.*?)(\s{4})/g;
                let r = /(\/{2})(\s+)(.*?)(\s{4}|\/{2})/g;
                let fixedComments = codeBracket.replace(r, function(a, b, c, d) {
                    return "/*" + d + "*/";
                });
                console.log(fixedComments);
                interpret(fixedComments);
            } else {
                interpret(superColliderEditor.getLine(superColliderEditor.getCursor().line));
            }
        }
    };

    javaScriptEditor = new EditorClass();
    window.P5 = P5;

    // socket = io.connect('http://localhost:8080');
    socket.on('pushFiles', function(data) {
        files = data;
    });
    socket.emit('pullFiles', "");
    socket.on('pushMessage', function(data) {
        logJavaScriptConsole(data);
    });

    socket.on('toscdconsole', function(data) {
        logSuperColliderConsole(data);
    });

    superColliderConsole = document.getElementById("supercollider-console");
    javaScriptConsole = document.getElementById("javascript-console");

    appControl = window.document.getElementById("appcontrol");
    appControl.addEventListener("keyup", function(event) {
        event.preventDefault();
        if (event.keyCode === 13) {

            interpretAppControl(appcontrol.value);
        }
    });

    // window.setTimeout(function() {

    //     superColliderEditor.getInputField().blur();
    //     javaScriptEditor.cm.getInputField().blur();
    //     appControl.focus();
    // }, 10);

    keysActive = false;
    keysControl = document.getElementById("keys-active");
    keysControl.addEventListener("mouseenter", function(event) {
        keysActive = true;
        superColliderEditor.setOption("readOnly", keysActive);
        javaScriptEditor.cm.setOption("readOnly", keysActive);
        // console.log("Enter the zone!");
    }, false);
    keysControl.addEventListener("mouseleave", function(event) {
        keysActive = false;
        superColliderEditor.setOption("readOnly", keysActive);
        javaScriptEditor.cm.setOption("readOnly", keysActive);
        // console.log("Leave the zone!");
    }, false);
}

function interpretAppControl(value) {
    if (value === "ls") {
        console.log("whoa!");
        let allFiles = "";
        for (let i = 0; i < files.scd.length; i++) {
            let comma = ", ";
            allFiles += files.scd[i].name + comma;
        }
        for (let i = 0; i < files.js.length; i++) {
            let comma = (i < files.js.length - 1) ? ", " : "";
            allFiles += files.js[i].name + comma;
        }
        logJavaScriptConsole(allFiles);
        return;
    }
    if (value === "cc") {
        while (javaScriptConsole.firstChild) {
            javaScriptConsole.removeChild(javaScriptConsole.firstChild);
        }
        while (superColliderConsole.firstChild) {
            superColliderConsole.removeChild(superColliderConsole.firstChild);
        }
        return;
    }
    var loadTest = /(^load\s|^l\s)([\s\S]*)/;
    var loadMatch = loadTest.exec(value);
    if (loadMatch) {
        console.log("match : " + loadMatch[2]); // abc
        let matchedFile = false;
        for (let i = 0; i < files.scd.length; i++) {
            if (files.scd[i].name == loadMatch[2]) {
                superColliderEditor.setValue(files.scd[i].data);
                currentLoadedFiles.scd = files.scd[i].name;
                matchedFile = true;
            }
        }
        if (!matchedFile) {
            for (let i = 0; i < files.js.length; i++) {
                if (files.js[i].name == loadMatch[2]) {
                    javaScriptEditor.cm.setValue(files.js[i].data);
                    currentLoadedFiles.js = files.js[i].name;
                    matchedFile = true;
                }
            }
        }
        if (matchedFile) {
            return;
        }
    }
    var saveTest = /(^save\s|^s\s)([\s\S]*)/;
    var saveMatch = saveTest.exec(value);
    if (saveMatch) {
        console.log("match : " + saveMatch[2]); // abc
        let matchedFile = false;
        for (let i = 0; i < files.scd.length; i++) {
            if (files.scd[i].name == saveMatch[2]) {
                files.scd[i].data = superColliderEditor.getValue();
                socket.emit('saveFile', files.scd[i]);
                // superColliderEditor.setValue(files.scd[i].data);
                // currentLoadedFiles.scd = files.scd[i].name;
                matchedFile = true;
            }
        }
        if (!matchedFile) {
            for (let i = 0; i < files.js.length; i++) {
                if (files.js[i].name == saveMatch[2]) {
                    files.js[i].data = javaScriptEditor.cm.getValue();
                    socket.emit('saveFile', files.js[i]);
                    // javaScriptEditor.cm.setValue(files.js[i].data);
                    // currentLoadedFiles.js = files.js[i].name;
                    matchedFile = true;
                }
            }
        }
        if (matchedFile) {
            return;
        }
    }
    logJavaScriptConsole("Invalid statement.");
}

function logJavaScriptConsole(msg) {
    var span = document.createElement('span')
    span.innerHTML = "<br>" + msg;
    javaScriptConsole.appendChild(span);
    javaScriptConsole.scrollTop = javaScriptConsole.scrollHeight;
}

function logSuperColliderConsole(msg) {
    if (msg.length > 0 && typeof msg === 'string' && msg !== null) {
        let r = msg.match(/^\s*$/);
        if (r === null) {
            var span = document.createElement('span')
            span.innerHTML = "<br>" + msg;
            // span.innerHTML = msg;
            superColliderConsole.appendChild(span);
            superColliderConsole.scrollTop = superColliderConsole.scrollHeight;
        }
    }
}