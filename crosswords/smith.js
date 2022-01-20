var LEXICON = null;
var DIAGRAM = null;
var BLACKLIST = null;
var BACKTRACKS = 0;


const EXIT_SUCCESS = 0;
const EXIT_FAILURE = 1;
const EXIT_TIMEOUT = 2;
const EXIT_BREAKPOINT = 3;


class Slot {

    constructor(start_square, accross, row, col, length) {
        this.start_square = start_square;
        this.accross = accross;
        this.row = row;
        this.col = col;
        this.length = length;
        this.filled = false;
        this.word = null;
        this.wordIndex = null;
        this.alternatives = null;
    }

    fill(wordIndex) {
        this.filled = true;
        this.wordIndex = wordIndex;
        this.word = LEXICON.lengths[this.length][this.wordIndex];
    }

    indices() {
        let arr = [];
        if (this.accross) {
            for (let k = 0; k < this.length; k++) {
                arr.push([this.row, this.col + k]);
            }
        } else {
            for (let k = 0; k < this.length; k++) {
                arr.push([this.row + k, this.col]);
            }
        }
        return arr;
    }

    interlocks(other) {
        let this_indices = this.indices();
        let other_indices = other.indices();
        for (let k = 0; k < this_indices.length; k++) {
            for (let p = 0; p < other_indices.length; p++) {
                if (this_indices[k][0] == other_indices[p][0] && this_indices[k][1] == other_indices[p][1]) {
                    return true;
                }
            }
        }
        return false;
    }

}

const UNIT_FREE = 0;
const UNIT_BLOCKED = 1;

class Diagram {

    constructor(rows, cols, block_probability, preset) {
        this.rows = rows;
        this.cols = cols;
        this.grid = [];
        if (preset != null) {
            this.generate_from_preset(preset);
        } else {
            this.generate_grid(block_probability);
        }
        this.letters = [];
        for (let i = 0; i < this.rows; i++) {
            this.letters.push([]);
            for (let j = 0; j < this.cols; j++) {
                this.letters[i].push(null);
            }
        }
        this.start_squares = [];
        this.slots = [];
        let blocked_left, free_right, blocked_top, free_bottom, is_sp_accross, is_sp_down;
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                blocked_left = (j - 1 < 0) || (this.grid[i][j - 1] == UNIT_BLOCKED);
                free_right = (j + 1 < this.cols) && (this.grid[i][j + 1] == UNIT_FREE);
                blocked_top = (i - 1 < 0) || (this.grid[i - 1][j] == UNIT_BLOCKED);
                free_bottom = (i + 1 < this.rows) && (this.grid[i + 1][j] == UNIT_FREE);
                is_sp_accross = blocked_left && free_right;
                is_sp_down = blocked_top && free_bottom;
                if (this.grid[i][j] == UNIT_FREE && (is_sp_accross || is_sp_down)) {
                    let start_square_index = this.start_squares.length;
                    this.start_squares.push([i, j]);
                    if (is_sp_accross) {
                        let p = j;
                        while (p < this.cols && this.grid[i][p] == UNIT_FREE) {
                            p += 1;
                        }
                        this.slots.push(new Slot(start_square_index, true, i, j, p - j));
                    }
                    if (is_sp_down) {
                        let p = i;
                        while (p < this.rows && this.grid[p][j] == UNIT_FREE) {
                            p += 1;
                        }
                        this.slots.push(new Slot(start_square_index, false, i, j, p - i));
                    }
                }
            }
        }

        // console.log(this.slots);

    }

    print() {
        let s = "";
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                if (this.grid[i][j] == UNIT_FREE) {
                    if (this.letters[i][j] != null) {
                        s = s + this.letters[i][j] + " ";
                    } else {
                        s = s + "  ";
                    }
                } else {
                    s = s + "* ";
                }
            }
            s = s + "\n";
        }
        console.log(s);
        // return s;
    }

    get_neighbors(i, j) {
        let neighbors = [];
        if (i > 0) neighbors.push([i - 1, j]);
        if (i < this.rows - 1) neighbors.push([i + 1, j]);
        if (j > 0) neighbors.push([i, j - 1]);
        if (j < this.cols - 1) neighbors.push([i, j + 1]);
        return neighbors;
    }

    generate_from_preset(preset) {
        this.grid = [];
        let split = preset.split("2");
        this.rows = split.length;
        this.cols = split[0].length;
        for (let i = 0; i < this.rows; i++) {
            this.grid.push([]);
            for (let j = 0; j < this.cols; j++) {
                if (split[i][j] == "0") {
                    this.grid[i].push(UNIT_FREE);
                } else {
                    this.grid[i].push(UNIT_BLOCKED);
                }
            }
        }
    }

    generate_grid(block_probability) {
        this.grid = [];
        let candidates = [];
        for (let i = 0; i < this.rows; i++) {
            this.grid.push([]);
            for (let j = 0; j < this.cols; j++) {
                this.grid[i].push(UNIT_FREE);
                candidates.push([i, j]);
            }
        }
        let n = this.rows * this.cols * block_probability;
        shuffleArray(candidates);
        let blocked = 0;
        while (blocked < n && candidates.length > 0) {
            let next_block = candidates.pop();
            this.grid[next_block[0]][next_block[1]] = UNIT_BLOCKED;
            candidates = candidates.filter(block => {
                /*
                if (Math.abs(block[0] - next_block[0]) + Math.abs(block[1] - next_block[1]) <= 1) {
                    return false;
                }
                */
                let neighbors = this.get_neighbors(...block);
                for (let k = 0; k < neighbors.length; k++) {
                    let neighbor_neighbors = this.get_neighbors(...neighbors[k]);
                    let free_count = 0;
                    neighbor_neighbors.forEach(nn => {
                        if (this.grid[nn[0]][nn[1]] == UNIT_FREE) free_count++;
                    });
                    if (free_count == 1) return false;
                }
                return true;
            });
            blocked++;
        }
    }

    get_empty_slots() {
        return this.slots.filter(s => !s.filled);
    }

    get_slot_frame(slot) {
        if (slot.accross) {
            return this.letters[slot.row].slice(slot.col, slot.col + slot.length);
        } else {
            let slot_frame = [];
            for (let i = slot.row; i < slot.row + slot.length; i++) {
                slot_frame.push(this.letters[i][slot.col]);
            }
            return slot_frame;
        }
    }

    fill(slot) {
        if (slot.accross) {
            for (let k = 0; k < slot.word.length; k++) {
                let j = k + slot.col;
                this.letters[slot.row][j] = slot.word[k];
            }
        } else {
            for (let k = 0; k < slot.word.length; k++) {
                let i = k + slot.row;
                this.letters[i][slot.col] = slot.word[k];
            }
        }
    }

    refill() {
        this.letters = [];
        for (let i = 0; i < this.rows; i++) {
            this.letters.push([]);
            for (let j = 0; j < this.cols; j++) {
                this.letters[i].push(null);
            }
        }
        this.slots.forEach(slot => {
            if (slot.filled) {
                this.fill(slot);
            }
        });
    }

}


function intersectTwoSets(setA, setB) {
    let setC = new Set();
    setA.forEach(a => {
        if (setB.has(a)) {
            setC.add(a);
        }
    });
    return setC;
}


function intersect(...sets) {
    return sets.reduce((a, b) => [...a].filter(c => b.has(c)));
}

function difference(a, b) {
    // Computes a - b
    return new Set([...a].filter(x => !b.has(x)));
}


class Lexicon {

    constructor(words) {
        this.words = [];
        for (let k = 0; k < words.length; k++) {
            let word = words[k].toUpperCase();
            let skip = false;
            [" ", "'", "-", "."].forEach(character => {
                if (word.includes(character)) {
                    skip = true;
                }
            });
            if (!skip && !this.words.includes(word)) {
                this.words.push(word);
            }
        }
        shuffleArray(this.words);
        this.alphabet = Array.from(new Set(this.words.join("")));
        this.alphabet.sort();
        this.ialphabet = {};
        for (let i = 0; i < this.alphabet.length; i++) {
            this.ialphabet[this.alphabet[i]] = i;
        }
        this.lengths = {};
        this.ilengths = {};
        this.words.forEach(word => {
            let length = word.length;
            if (!(length in this.lengths)) {
                this.lengths[length] = [];
            }
            this.lengths[length].push(word);
            this.ilengths[word] = this.lengths[length].length - 1;
        });
        this.bitmaps = {};
        for (let l in this.lengths) {
            // console.log("Creating bitmap for length", l);
            this.bitmaps[l] = {};
            for (let j = 0; j < this.alphabet.length; j++) {
                this.bitmaps[l][j] = {};
                for (let k = 0; k < l; k++) {
                    this.bitmaps[l][j][k] = new Set();
                }
            }
            this.lengths[l].forEach((word, i) => {
                this.alphabet.forEach((letter, j) => {
                    for (let k = 0; k < word.length; k++) {
                        if (word[k] == letter) {
                            this.bitmaps[l][j][k].add(i);
                        }
                    }
                });
            });
        }
    }


    shuffle() {
        shuffleArray(this.words);
        this.lengths = {};
        this.ilengths = {};
        this.words.forEach(word => {
            let length = word.length;
            if (!(length in this.lengths)) {
                this.lengths[length] = [];
            }
            this.lengths[length].push(word);
            this.ilengths[word] = this.lengths[length].length - 1;
        });
        this.bitmaps = {};
        for (let l in this.lengths) {
            // console.log("Creating bitmap for length", l);
            this.bitmaps[l] = {};
            for (let j = 0; j < this.alphabet.length; j++) {
                this.bitmaps[l][j] = {};
                for (let k = 0; k < l; k++) {
                    this.bitmaps[l][j][k] = new Set();
                }
            }
            this.lengths[l].forEach((word, i) => {
                this.alphabet.forEach((letter, j) => {
                    for (let k = 0; k < word.length; k++) {
                        if (word[k] == letter) {
                            this.bitmaps[l][j][k].add(i);
                        }
                    }
                });
            });
        }
    }

    select_word(slot_frame) {
        let l = slot_frame.length;
        let bitmaps = [];
        let empty = true;
        slot_frame.forEach((letter, k) => {
            if (letter != null) {
                empty = false;
                let j = this.ialphabet[letter];
                bitmaps.push(this.bitmaps[l][j][k]);
            }
        });
        if (empty) {
            return Array.from(difference([...Array(this.lengths[l].length).keys()], BLACKLIST[l]));
        } else {
            return Array.from(difference(intersect(...bitmaps), BLACKLIST[l]));
        }
    }

}


function aux(slot_table, slot_index, time_start, time_max) {
    if (slot_index >= slot_table.length) return EXIT_SUCCESS;
    if (new Date() - time_start > time_max) return EXIT_TIMEOUT;
    let slot = slot_table[slot_index];
    let slot_frame = DIAGRAM.get_slot_frame(slot);
    let words = LEXICON.select_word(slot_frame);
    for (let p = 0; p < words.length; p++) {
        let word_index = words[p];
        slot.fill(word_index);
        DIAGRAM.fill(slot);
        BLACKLIST[slot.length].add(word_index);
        let recursive_output = aux(slot_table, slot_index + 1, time_start, time_max);
        if (recursive_output != EXIT_FAILURE) {
            if (recursive_output == EXIT_SUCCESS) {
                return EXIT_SUCCESS;
            } else if (recursive_output == EXIT_TIMEOUT) {
                return EXIT_TIMEOUT;
            } else if (recursive_output == EXIT_BREAKPOINT) {
                return EXIT_BREAKPOINT;
            }
        }
        BLACKLIST[slot.length].delete(slot.wordIndex);
    }
    slot.filled = false;
    DIAGRAM.refill();
    BACKTRACKS++;
    return EXIT_FAILURE;
}


function generate(diagram, lexicon, time_max) {
    console.log("Generating…");
    diagram.slots.forEach(slot => {
        slot.word = null;
        slot.filled = false;
    });
    diagram.refill();
    BLACKLIST = {};
    for (let l in lexicon.lengths) {
        BLACKLIST[l] = new Set();
    }
    let slot_table_raw = [];
    let slot_table_sorted = [];
    diagram.slots.forEach(slot => {
        slot.alternatives = lexicon.lengths[slot.length].length;
        slot_table_raw.push(slot);
    });

    // step (i)
    let min_index = null;
    for (let i = 0; i < slot_table_raw.length; i++) {
        if (min_index == null || slot_table_raw[min_index].alternatives > slot_table_raw[i].alternatives) {
            min_index = i;
        }
    }
    let slot = slot_table_raw.splice(min_index, 1)[0];
    slot_table_sorted.push(slot);

    while (slot_table_raw.length > 0) {
        // step (ii)
        let interlocking = [];
        slot_table_raw.forEach((other_slot, interlocking_i) => {
            if (slot.interlocks(other_slot)) {
                let k = 0;
                slot_table_sorted.forEach(sorted_slot => {
                    if (sorted_slot.interlocks(other_slot)) {
                        k++;
                    }
                });
                other_slot.alternatives = Math.pow(
                    LEXICON.lengths[other_slot.length].length,
                    (other_slot.length - k) / other_slot.length
                );
                interlocking.push(interlocking_i);
            }
        });

        // step (iii)
        if (interlocking.length > 0) {
            interlocking.sort((a, b) => {
                return slot_table_raw[a].alternatives - slot_table_raw[b].alternatives;
            });
            slot = slot_table_raw.splice(interlocking.shift(), 1)[0];
        } else {
            slot_table_raw.sort((a, b) => {
                return a.alternatives - b.alternatives;
            });
            slot = slot_table_raw.shift();
        }
        slot_table_sorted.push(slot);
    }

    BACKTRACKS = 0;
    output = aux(slot_table_sorted, 0, new Date(), time_max);
    console.log("Exit status is",
        (output == EXIT_SUCCESS ? "SUCCESS" : (
            output == EXIT_FAILURE ? "FAILURE" : (
                output == EXIT_TIMEOUT ? "TIMEOUT" : (
                    output == EXIT_BREAKPOINT ? "BREAKPOINT" : ""
                )
            )
        ))
    );
    console.log("Bactracked", BACKTRACKS, "times");
    if (output != EXIT_SUCCESS) {
        // alert("Une erreur est survenue durant la génération");
    }
    return output;
}