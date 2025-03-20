// App Info
const APP_NAME = "Terminal";
const APP_VERSION = "1.0";
const APP_DESC =
    "A web-based terminal that executes commands, keeps input history and mimics a real terminal experience.";

// Theme Colors
let DEFAULT_THEME_FG = getCSSVariable("--accent");
let DEFAULT_THEME_BG = getCSSVariable("--primary");

let THEME_FG = localStorage.getItem("THEME_FG");
let THEME_BG = localStorage.getItem("THEME_BG");

loadTheme();

// Available Commands
let COMMANDS = {
    help: {
        name: "help",
        description: "Provides help information for commands.",
        usage: "HELP [command]",
        function: terminal_help,
        args_accepted: 1,
    },
    color: {
        name: "color",
        description: "Sets the default foreground and background colors.",
        usage: `COLOR [fgcolor] [bgcolor]
    fgcolor    Foreground color (web color or hex code)
    bgcolor    Background color (web color or hex code)

If no color is specified, this command restores the default color of Terminal.

example: color #04a03d black
`,
        function: terminal_color,
        args_accepted: 2,
    },
    clear: {
        name: "clear",
        description: "Clears the terminal screen.",
        usage: "CLEAR",
        function: terminal_clear,
        args_accepted: 0,
    },
    echo: {
        name: "echo",
        description: "Displays message.",
        usage: "ECHO [message]",
        function: terminal_echo,
        args_accepted: 1,
    },
    hello: {
        name: "hello",
        description: "Prints hello",
        usage: "HELLO [text]",
        function: terminal_hello,
        args_accepted: 1,
    },
    prompt: {
        name: "prompt",
        description: "Changes the prompt symbol of Terminal.",
        usage: "PROMPT [text]",
        function: terminal_prompt,
        args_accepted: 1,
    },
    title: {
        name: "title",
        description: "Displays or changes the title of Terminal.",
        usage: "TITLE [text]",
        function: terminal_title,
        args_accepted: 1,
    },
    time: {
        name: "time",
        description: "Displays the time.",
        usage: "TIME",
        function: terminal_time,
        args_accepted: 0,
    },
    version: {
        name: "version",
        description: "Displays the Terminal version.",
        usage: "VERSION",
        function: terminal_version,
        args_accepted: 0,
    },
    date: {
        name: "date",
        description: "Displays the date.",
        usage: "DATE",
        function: terminal_date,
        args_accepted: 0,
    },
};

COMMANDS = Object.fromEntries(
    Object.entries(COMMANDS).sort(([keyA], [keyB]) => {
        return keyA.localeCompare(keyB);
    })
);

// Terminal Standard Input/Output
let TERMINAL = null;

// Terminal's prompt symbol
let PromptSymbol = "~$";

// User's Input history
let InputHistory = [];
let historyIndex = -1;
const MAX_HISTORY = 80; // maximum stored commands

// Main Entry Point
document.addEventListener("DOMContentLoaded", () => {
    TERMINAL = document.getElementById("stdout");

    // Focus prompt when terminal click
    TERMINAL.addEventListener("click", (event) => {
        document.querySelector(".terminal-line-input").focus();
    });

    // Get input on each Enter keypress
    TERMINAL.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();

            // Get the Prompt and execute command
            let active_prompt = event.target;
            let command = remove_extra_spaces(active_prompt.innerText.trim());

            // Make prompt un-editable
            active_prompt.classList.remove("terminal-line-input");
            active_prompt.contentEditable = "false";

            // Process and execute the command
            process_command(command);

            // Add command to history
            pushToInputHistory(command);

            // Spawn a Prompt for user to type commands
            spawn_prompt();
        } else if (event.key === "ArrowUp") {
            if (historyIndex > 0) {
                historyIndex--;
                event.target.innerText = InputHistory[historyIndex];
            }
            event.preventDefault();
        } else if (event.key === "ArrowDown") {
            if (historyIndex < InputHistory.length - 1) {
                historyIndex++;
                event.target.innerText = InputHistory[historyIndex];
            } else {
                // Clear the prompot
                event.target.innerText = "";
            }
        }
    });
});

// Close the current tab
function exitTerminal() {
    window.close();
}

// Print text onto the TERMINAL
function print_line(text = "") {
    text = text.toString().trim();
    if (!text) return;

    // Print each line separately
    text.split("\n").forEach((line) => {
        TERMINAL.innerHTML += `<span class="terminal-line"><pre>${line}</pre></span>`;
    });
}

// Spawn a prompt in the TERMINAL
function spawn_prompt() {
    // Create new prompt
    let new_prompt = document.createElement("span");
    new_prompt.classList.add("terminal-line");

    // Create Symbol
    let symbol = document.createElement("span");
    symbol.textContent = `${PromptSymbol} `;

    // Create new input (PROMPT)
    let new_input = document.createElement("span");
    new_input.classList.add("terminal-line-input");
    new_input.spellcheck = "false"; // FIX: NOT WORKING (for some reason)
    new_input.contentEditable = "true";

    new_prompt.appendChild(symbol);
    new_prompt.appendChild(new_input);
    TERMINAL.appendChild(new_prompt);

    new_input.focus();
}

function remove_extra_spaces(text) {
    return text
        .split(" ")
        .map((word) => word.trim())
        .join(" ");
}

// Parses the command
function parse_command(command) {
    let regex = /[^\s"]+|"([^"]*)"/g;
    let matches = [];

    let match;
    while ((match = regex.exec(command)) !== null) {
        // Push match without quotes (if there were any)
        matches.push(match[1] ? match[1] : match[0]);
    }

    return matches;
}

// Processes and executes the prompt
function process_command(command = "") {
    // Command empty?
    if (!command) return "";

    // Parse the command
    let command_tokens = parse_command(command);
    let action = command_tokens[0].toLowerCase(); // Action of the command
    let args = command_tokens.slice(1); // Args for the action

    // Unrecognized command?
    if (!Object.hasOwn(COMMANDS, action)) {
        print_line(`'${action}' is not recognized as a command. (Try 'help' to see available commands)<br/><br/>`);
        return;
    }

    let args_accepted = COMMANDS[action].args_accepted;

    // ARGs more that accepted?
    if (args.length > args_accepted) {
        if (args_accepted === 0) {
            print_line(`'${action}' accepts no arguments.`);
        } else {
            print_line(`'${action}' accepts only ${args_accepted} arguments.`);
        }
        return;
    }

    // Execute Command with args
    let output_text = COMMANDS[action].function(args);

    if (output_text) {
        print_line(output_text);
    }
}

// Command Function Definitions
function terminal_help(args) {
    // Any Arg?
    if (args.length === 1) {
        // Arg valid?
        if (!Object.hasOwn(COMMANDS, args[0])) {
            return `This command '${args[0]}' is not supported by help utility.`;
        }

        return `${COMMANDS[args[0]].description}\n\nusage: ${COMMANDS[args[0]].usage}\n`;
    }

    // Terminal Help
    let help_message = `${APP_NAME} ${APP_VERSION}\n\nDescription:\n${APP_DESC}`;

    let commands = "\n\nAvailable Commands:\n";
    for (let key in COMMANDS) {
        let temp = `${key.padEnd(10)} ${COMMANDS[key].description}\n`;
        commands += temp;
    }
    return help_message + commands;
}

function terminal_clear() {
    TERMINAL.innerHTML = "";
}

function terminal_hello(args) {
    if (args.length == 1) {
        return `Hello, ${title(args[0])}`;
    }

    // Default
    return "Hello, World!";
}

function terminal_color(args) {
    // No ARGS?
    if (args.length === 0) {
        // Restore color
        changeCSSVariable("--accent", DEFAULT_THEME_FG);
        changeCSSVariable("--primary", DEFAULT_THEME_BG);
    }

    // Has fgcolor?
    if (args[0] !== undefined) {
        // Set foreground color
        changeCSSVariable("--accent", args[0]);
    }

    // Has bgcolor?
    if (args[1] != undefined) {
        // Set Background color
        changeCSSVariable("--primary", args[1]);
    }

    localStorage.setItem("THEME_FG", getCSSVariable("--accent"));
    localStorage.setItem("THEME_BG", getCSSVariable("--primary"));
}

function terminal_time() {
    const timeFormat = new Intl.DateTimeFormat("en-US", {
        timeStyle: "full",
    });

    let datetime = new Date();
    return `Current local time is: ${timeFormat.format(datetime.getTime())}`;
}

function terminal_date() {
    const dateFormat = new Intl.DateTimeFormat("en-US", {
        dateStyle: "full",
    });

    let datetime = new Date();
    return `Current date is: ${dateFormat.format(datetime.getTime())}`;
}

function terminal_title(args) {
    // Get the title element
    let title_element = document.querySelector(".terminal-title");

    // No Args?
    if (args.length === 0) {
        // Show title
        return title_element.innerText;
    }

    // Change title
    title_element.innerText = args[0];
}

function terminal_echo(args) {
    return args.length ? args[0] : "'echo' expects a message.";
}

function terminal_prompt(args) {
    if (!args.length) {
        return "'prompt' expects text (prompt symbol).";
    }

    PromptSymbol = args[0];
}

function terminal_version() {
    return `${APP_NAME} [Version ${APP_VERSION}]`;
}

// Helper Functions

// Apparently Yavascript does NOT have a built-in function to
//  capitalize a string or converting it to title case.

function title(text) {
    // Iterate through each word
    return text
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}

function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// Change a CSS variable
function changeCSSVariable(var_name, value) {
    document.documentElement.style.setProperty(var_name, value);
}

// Get a CSS variable
function getCSSVariable(var_name) {
    return getComputedStyle(document.documentElement).getPropertyValue(var_name);
}

// Loads the theme
function loadTheme() {
    // Set to Dark Mode
    changeCSSVariable("--accent", THEME_FG);
    changeCSSVariable("--primary", THEME_BG);
}

// Pushes an item to inputHistory
function pushToInputHistory(item) {
    if (InputHistory.length >= MAX_HISTORY) {
        // Remove one from start and add one to the end
        InputHistory.shift();
    }

    InputHistory.push(item);
    historyIndex = InputHistory.length;
}
