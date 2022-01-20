const LEXICON_PATH = "data/ouestfrance.json";


var CLUES = {};
var DOM_DIAGRAM = null;


function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}


function inflateDiagram(diagram) {
    let container = document.getElementById("diagram");
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
                input.maxLength = 1;
                cellEl.appendChild(input);
            }
            DOM_DIAGRAM[i].push(cellEl);
            rowEl.appendChild(cellEl);
        });
        container.appendChild(rowEl);
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


function showFilledDiagram(diagram) {
    for (let i = 0; i < diagram.rows; i++) {
        for (let j = 0; j < diagram.cols; j++) {
            if (diagram.letters[i][j] != null) {
                DOM_DIAGRAM[i][j].querySelector("input").value = diagram.letters[i][j];
            } else if (diagram.grid[i][j] == UNIT_FREE) {
                DOM_DIAGRAM[i][j].querySelector("input").value = "";
            }
        }
    }
}


function generateDiagram() {
    let params = new URLSearchParams(window.location.search);
    let width = params.has("w") ? parseInt(params.get("w")) : 13;
    let height = params.has("h") ? parseInt(params.get("h")) : 9;
    let block_probability = params.has("p") ? parseFloat(params.get("p")) : 0.3;
    let preset = params.has("s") ? params.get("s") : null;
    DIAGRAM = new Diagram(height, width, block_probability, preset);
    inflateDiagram(DIAGRAM);
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
            let startSquare = cell.querySelector(".start-square");
            console.log(cell);
            if (startSquare != null) {
                let squareNumber = parseInt(startSquare.textContent);
                let callbackIn = (event) => {
                    document.querySelectorAll("li[value='" + squareNumber + "']").forEach(li => {
                        li.classList.add("active");
                    });
                }
                let callbackOut = (event) => {
                    document.querySelectorAll("li[value='" + squareNumber + "']").forEach(li => {
                        li.classList.remove("active");
                    });
                }
                cell.addEventListener("focusin", callbackIn);
                cell.addEventListener("focusout", callbackOut);
            }
        });

    }, 100);

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
});