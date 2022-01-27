const LEXICON_PATH = "data/ouestfrance.json";


var CLUES = {};
var DOM_DIAGRAM = null;


function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}


function inflateDiagram(diagram) {
    let container = document.getElementById("diagram");
    let displayErrorSwitch = document.getElementById("input-display-errors");
    DOM_DIAGRAM = [];
    container.innerHTML = "";
    diagram.grid.forEach((row, i) => {
        let rowEl = document.createElement("div");
        rowEl.className = "row";
        DOM_DIAGRAM.push([]);
        row.forEach(cell => {
            let cellEl = document.createElement("div");
            cellEl.className = "cell";
            if (cell == UNIT_BLOCKED) {
                cellEl.classList.add("blocked");
            } else {
                let input = document.createElement("input");
                input.addEventListener("input", () => {
                    if (displayErrorSwitch.checked) {
                        displayErrors();
                    } else {
                        cellEl.classList.remove("is-success");
                        cellEl.classList.remove("is-error");
                    }
                });
                input.maxLength = 1;
                cellEl.appendChild(input);
            }
            DOM_DIAGRAM[i].push(cellEl);
            rowEl.appendChild(cellEl);
        });
        container.appendChild(rowEl);
    });
    diagram.slots.forEach(slot => {
        let indices = slot.indices();
        for (let k = 0; k < indices.length; k++) {
            let i = indices[k][0];
            let j = indices[k][1];
            if (slot.accross) {
                DOM_DIAGRAM[i][j].setAttribute("accross", slot.start_square + 1);
            } else {
                DOM_DIAGRAM[i][j].setAttribute("down", slot.start_square + 1);
            }
        }
    });
}


function setClues() {
    let accross = [];
    let down = [];
    let start_squares = {};
    DIAGRAM.slots.forEach(slot => {
        if (slot.filled) {
            let entry = {
                ss: slot.start_square + 1,
                clue: choose(CLUES[slot.word])
            }
            if (!(slot.start_square in start_squares)) {
                start_squares[slot.start_square] = [slot.row, slot.col];
            }
            if (slot.accross) {
                accross.push(entry);
            } else {
                down.push(entry);
            }
        }
    });
    let container = document.getElementById("clues");
    container.innerHTML = "";

    let divHorizontal = document.createElement("div");
    divHorizontal.setAttribute("direction", "accross");
    divHorizontal.innerHTML += "<b>Horizontal</b>";
    let accrossList = document.createElement("ol");
    accross.forEach(entry => {
        let el = document.createElement("li");
        el.value = entry.ss;
        el.textContent = capitalizeFirstLetter(entry.clue);
        accrossList.appendChild(el);
    });
    divHorizontal.appendChild(accrossList);

    container.appendChild(divHorizontal);

    let divVertical = document.createElement("div");
    divVertical.setAttribute("direction", "down");
    divVertical.innerHTML += "<b>Vertical</b>";
    let downList = document.createElement("ol");
    down.forEach(entry => {
        let el = document.createElement("li");
        el.value = entry.ss;
        el.textContent = capitalizeFirstLetter(entry.clue);
        downList.appendChild(el);
    });
    divVertical.appendChild(downList);
    container.appendChild(divVertical);
    for (let ss in start_squares) {
        let i = start_squares[ss][0];
        let j = start_squares[ss][1];
        let label = document.createElement("span");
        label.className = "start-square";
        label.textContent = (parseInt(ss) + 1).toString();
        DOM_DIAGRAM[i][j].appendChild(label);
    }
}


function showFilledDiagram() {
    for (let i = 0; i < DIAGRAM.rows; i++) {
        for (let j = 0; j < DIAGRAM.cols; j++) {
            if (DIAGRAM.letters[i][j] != null) {
                DOM_DIAGRAM[i][j].querySelector("input").value = DIAGRAM.letters[i][j];
            } else if (DIAGRAM.grid[i][j] == UNIT_FREE) {
                DOM_DIAGRAM[i][j].querySelector("input").value = "";
            }
        }
    }
    displayErrors();
}


function decodePreset(preset) {
    if (preset == null) return null;
    let rows = parseInt(preset.slice(0, 2), 16);
    let cols = parseInt(preset.slice(2, 4), 16);
    let decoded = "";
    for (let i = 4; i < preset.length; i++) {
        decoded += parseInt(preset[i], 16).toString(2).padStart(4, "0");
    }
    decoded = decoded.padStart(rows * cols, "0");
    let regex = new RegExp("(.{" + cols + "})", "g");
    return decoded.replace(regex, "$12").slice(0, rows * cols + rows - 1);
}


function generateDiagram() {
    let params = new URLSearchParams(window.location.search);
    let width = params.has("w") ? parseInt(params.get("w")) : 13;
    let height = params.has("h") ? parseInt(params.get("h")) : 9;
    let block_probability = params.has("p") ? parseFloat(params.get("p")) : 0.3;
    let preset = params.has("s") ? params.get("s") : null;
    DIAGRAM = new Diagram(height, width, block_probability, decodePreset(preset));
    inflateDiagram(DIAGRAM);
    resizeElements();
}


function fillSlots() {
    document.getElementById("loader").classList.remove("hide");
    document.getElementById("content").classList.add("blurry");


    setTimeout(() => {
        let params = new URLSearchParams(window.location.search);
        let timeout = params.has("t") ? parseInt(params.get("t")) * 1000 : 1000;
        let retries = params.has("r") ? parseInt(params.get("r")) : 10;
        document.getElementById("loading-bar").max = retries;
        document.getElementById("loading-bar").value = 0;
        for (let r = 0; r < retries; r++) {
            setTimeout(() => {
                document.getElementById("loading-bar").value = r + 1;
            }, 10);
            let output = generate(DIAGRAM, LEXICON, timeout);
            if (output == EXIT_SUCCESS) {
                break;
            }
            if (r % 2 == 0) {
                generateDiagram();
            } else {
                LEXICON.shuffle();
            }
        }
        setClues();
        document.getElementById("content").classList.remove("blurry");
        document.getElementById("loader").classList.add("hide");

        document.querySelectorAll(".cell").forEach(cell => {
            cell.addEventListener("focusin", () => {
                if (cell.hasAttribute("accross")) {
                    document.querySelector("div[direction='accross'] li[value='" + cell.getAttribute("accross") + "']").classList.add("active");
                }
                if (cell.hasAttribute("down")) {
                    document.querySelector("div[direction='down'] li[value='" + cell.getAttribute("down") + "']").classList.add("active");
                }
            });
            cell.addEventListener("focusout", () => {
                if (cell.hasAttribute("accross")) {
                    document.querySelector("div[direction='accross'] li[value='" + cell.getAttribute("accross") + "']").classList.remove("active");
                }
                if (cell.hasAttribute("down")) {
                    document.querySelector("div[direction='down'] li[value='" + cell.getAttribute("down") + "']").classList.remove("active");
                }
            });
        });

        resizeElements();
        displayErrors();

    }, 100);

}


function displayErrors() {
    for (let i = 0; i < DIAGRAM.rows; i++) {
        for (let j = 0; j < DIAGRAM.cols; j++) {
            if (DIAGRAM.grid[i][j] == UNIT_FREE) {
                let input = DOM_DIAGRAM[i][j].querySelector("input");
                if (document.getElementById("input-display-errors").checked) {
                    if (input.value.match(/[a-zA-Z]/g)) {
                        if (input.value.toLowerCase() == DIAGRAM.letters[i][j].toLowerCase()) {
                            DOM_DIAGRAM[i][j].classList.add("is-success");
                        } else {
                            DOM_DIAGRAM[i][j].classList.add("is-error");
                        }
                    } else {
                        DOM_DIAGRAM[i][j].classList.remove("is-success");
                        DOM_DIAGRAM[i][j].classList.remove("is-error");
                    }
                } else {
                    DOM_DIAGRAM[i][j].classList.remove("is-success");
                    DOM_DIAGRAM[i][j].classList.remove("is-error");
                }
            }
        }
    }
}


function resizeElements() {
    let diagramAspectRatio = 1;
    if (DIAGRAM.cols > 0 && DIAGRAM.rows > 0) {
        diagramAspectRatio = DIAGRAM.cols / DIAGRAM.rows;
    }
    let clueHeight = document.getElementById("clues").offsetHeight;
    let diagramHeight = window.innerHeight - clueHeight;
    let diagramWidth = Math.min(diagramAspectRatio * diagramHeight, window.innerWidth);
    console.log("Resizing diagram width to", diagramWidth, "px");
    document.getElementById("diagram").style.width = diagramWidth + "px";
}


window.addEventListener("load", () => {
    generateDiagram();
    fetch(LEXICON_PATH).then(res => res.json()).then(data => {
        let words = [];
        CLUES = {};
        data.lexicon.forEach(entry => {
            words.push(entry.word);
            CLUES[entry.word] = entry.clues;
        });
        console.log("Dataset contains", words.length, "words");
        LEXICON = new Lexicon(words);
        fillSlots();

    });
    window.addEventListener("resize", resizeElements);
});