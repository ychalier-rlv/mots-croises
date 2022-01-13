class Slot {

    constructor(start_square, accross, row, col, length) {
        this.start_square = start_square;
        this.accross = accross;
        this.row = row;
        this.col = col;
        this.length = length;
        this.filled = false;
        this.word = null;
        this.alternatives = null;
    }

    fill(word) {
        this.filled = true;
        this.word = word;
    }

}

const shuffleArray = array => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}


const UNIT_FREE = 0;
const UNIT_BLOCKED = 1;

class Diagram {

    constructor(rows, cols, block_probability) {
        this.rows = rows;
        this.cols = cols;
        this.grid = [];
        for (let i = 0; i < this.rows; i++) {
            this.grid.push([]);
            for (let j = 0; j < this.cols; j++) {
                if (Math.random() < block_probability) {
                    this.grid[i].push(UNIT_BLOCKED);
                } else {
                    this.grid[i].push(UNIT_FREE);
                }
            }
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
                this.letters[slot.row][k] = slot.word[k];
            }
        } else {
            for (let k = 0; k < slot.word.length; k++) {
                let i = k + slot.row;
                this.letters[i][slot.col] = slot.word[k];
            }
        }
        // console.log("Filled with", slot.word, ":", this.letters);
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
        this.words.forEach(word => {
            let length = word.length;
            if (!(length in this.lengths)) {
                this.lengths[length] = [];
            }
            this.lengths[length].push(word);
        });
        this.bitmaps = {};
        for (let l in this.lengths) {
            console.log("Creating bitmap for length", l);
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

    select_word = function*(slot_frame) {
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
            for (let k = 0; k < this.lengths[l].length; k++) {
                yield this.lengths[l][k];
            }
        }
        let arr = Array.from(intersect(...bitmaps));
        for (let k = 0; k < arr.length; k++) {
            let i = arr[k];
            yield this.lengths[l][i];
        }
    }

    count_possibilities(slot_frame) {
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
            return this.lengths[l].length;
        }
        return intersect(bitmaps).size;
    }

}


function generateAux(diagram, lexicon, time_start, time_max, blacklist) {
    // console.log("Generating AUX");
    let empty_slots = diagram.get_empty_slots();
    // console.log("Empty slots:", empty_slots);
    if (empty_slots.length == 0) {
        console.log("All slots are filled!");
        return true;
    }
    empty_slots.forEach(slot => {
        let slot_frame_i = diagram.get_slot_frame(slot);
        let k = 0;
        slot_frame_i.forEach(letter => {
            if (letter != null) {
                k++;
            }
        });
        let n = slot_frame_i.length;
        slot.alternatives = Math.pow(lexicon.lengths[n].length, (n - k) / n);
    });
    empty_slots.sort((a, b) => {
        return a.alternatives > b.alternatives;
    });
    // console.log("Empty slots sorted by alternatives:", empty_slots);
    let slot = empty_slots.shift();
    let slot_frame = diagram.get_slot_frame(slot);
    let word_iterator = lexicon.select_word(slot_frame);
    while (true) {
        let word = word_iterator.next().value;
        if (word == undefined || blacklist.has(word)) {
            break;
        }
        if (new Date() - time_start > time_max) {
            console.log("Early stopping");
            return false;
        }
        slot.fill(word);
        diagram.fill(slot);
        let extended_blacklist = new Set(blacklist);
        extended_blacklist.add(word);
        let recursive_output = generateAux(diagram, lexicon, time_start, time_max, extended_blacklist);
        if (recursive_output) {
            return true;
        }
    }
    slot.filled = false;
    diagram.refill();
    return false;
}


function generate(diagram, lexicon, time_max) {
    diagram.slots.forEach(slot => {
        slot.alternatives = lexicon.lengths[slot.length].length;
    });
    generateAux(diagram, lexicon, new Date(), time_max, new Set());
}