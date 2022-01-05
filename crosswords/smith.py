"""
Implementation of 'A prototype crossword compiler', P. D. Smith and S. Y. Steen, The Computer Journal, Vol. 24, No. 2, 1981.
"""

import numpy
import random
import json
import time


UNIT_FREE = 0
UNIT_BLOCKED = 1


class Slot:

    def __init__(self, start_square, accross, row, col, length):
        self.start_square = start_square
        self.accross = accross
        self.row = row
        self.col = col
        self.length = length
        self.filled = False
        self.word = None
        self.alternatives = None
    
    def __str__(self):
        return "\t".join(map(str, [
            self.start_square,
            self.accross,
            self.row,
            self.col,
            self.length,
            self.alternatives
        ]))

    def fill(self, word):
        self.filled = True
        self.word = word


class Diagram:

    def __init__(self, rows, cols, block_probability):
        self.rows = rows
        self.cols = cols
        self.grid = [
            [
                UNIT_BLOCKED if random.random() < block_probability else UNIT_FREE for _ in range(self.cols)
            ]
            for _ in range(self.rows)
        ]
        self.letters = [
            [
                None for _ in range(self.cols)
            ]
            for _ in range(self.rows)
        ]
        self.start_squares = []
        self.slots = []
        for i in range(self.rows):
            for j in range(self.cols):
                blocked_left = j - 1 < 0 or self.grid[i][j - 1] == UNIT_BLOCKED
                free_right = j + 1 < self.cols and self.grid[i][j + 1] == UNIT_FREE
                blocked_top = i - 1 < 0 or self.grid[i - 1][j] == UNIT_BLOCKED
                free_bottom = i + 1 < self.rows and self.grid[i + 1][j] == UNIT_FREE
                is_sp_accross = blocked_left and free_right
                is_sp_down = blocked_top and free_bottom
                if self.grid[i][j] == UNIT_FREE and (is_sp_accross or is_sp_down):
                    start_square_index = len(self.start_squares)
                    self.start_squares.append((i, j))
                    if is_sp_accross:
                        p = j
                        while p < self.cols and self.grid[i][p] == UNIT_FREE:
                            p += 1
                        self.slots.append(Slot(start_square_index, True, i, j, p - j))
                    if is_sp_down:
                        p = i
                        while p < self.rows and self.grid[p][j] == UNIT_FREE:
                            p += 1
                        self.slots.append(Slot(start_square_index, False, i, j, p - i))
            

    def __str__(self):
        s = ""
        for i in range(self.rows):
            for j in range(self.cols):
                if self.grid[i][j] == UNIT_FREE:
                    if self.letters[i][j] is None:
                        s += "  "
                    else:
                        s += self.letters[i][j] + " "
                else:
                    s += "* "
            s += "\n"
        return s
    
    def get_empty_slots(self):
        return filter(lambda slot: not slot.filled, self.slots)
    
    def get_slot_frame(self, slot):
        if slot.accross:
            return self.letters[slot.row][slot.col:slot.col + slot.length]
        return [
            row[slot.col]
            for row in self.letters[slot.row:slot.row + slot.length]
        ]
    
    def fill(self, slot):
        if slot.accross:
            for j, c in zip(range(slot.col, slot.col + slot.length), slot.word):
                self.letters[slot.row][j] = c
        else:
            for i, c in zip(range(slot.row, slot.row + slot.length), slot.word):
                self.letters[i][slot.col] = c
    
    def refill(self):
        self.letters = [
            [
                None for _ in range(self.cols)
            ]
            for _ in range(self.rows)
        ]
        for slot in self.slots:
            if slot.filled:
                self.fill(slot)


class Lexicon:

    def __init__(self, words):
        self.words = [
            w
            for w in set(map(lambda s: s.upper(), words))
            if not {" ", "'", "-", "."}.intersection(w)
        ]
        random.shuffle(self.words)
        # self.words = self.words[:8000] # .sort()
        self.alphabet = sorted(set("".join(self.words)))
        self.ialphabet = {
            letter: i
            for i, letter in enumerate(self.alphabet)
        }
        self.lengths = {}
        for word in self.words:
            self.lengths.setdefault(len(word), [])
            self.lengths[len(word)].append(word)
        self.bitmaps = {}
        for l in sorted(self.lengths):
            print("Creating bitmap for length", l)
            self.bitmaps[l] = numpy.zeros((
                len(self.lengths[l]),
                len(self.alphabet),
                l
            ))
            for i, word in enumerate(self.lengths[l]):
                for j, letter in enumerate(self.alphabet):
                    for k, char in enumerate(word):
                        if char == letter:
                            self.bitmaps[l][i, j, k] = 1

    def select_word(self, frame):
        """
        Return None if there is no possibility
        """
        l = len(frame)
        bitmaps = []
        empty = True
        for k, char in enumerate(frame):
            if char is not None:
                empty = False
                j = self.ialphabet[char]
                bitmaps.append(self.bitmaps[l][:,j,k])
        if empty:
            # print("Returning empty")
            for w in self.lengths[l]:
                yield w
            # return iter(self.lengths[l])
        arr = numpy.array(bitmaps)
        choices = numpy.where(numpy.all(arr, axis=0))[0]
        if choices.size == 0:
            # print("0 choices")
            return []
        for i in choices:
            yield self.lengths[l][i]
        # return self.lengths[l][choices]
    
    def count_possibilities(self, frame):
        l = len(frame)
        bitmaps = []
        empty = True
        for k, char in enumerate(frame):
            if char is not None:
                empty = False
                j = self.ialphabet[char]
                bitmaps.append(self.bitmaps[l][:,j,k])
        if empty:
            return len(self.lengths[l])
        arr = numpy.array(bitmaps)
        choices = numpy.where(numpy.all(arr, axis=0))[0]
        return choices.size


def generate_aux(diagram, lexicon, blacklist={}):
    empty_slots = list(diagram.get_empty_slots())
    if len(empty_slots) == 0:
        print("All slots are filled!")
        return True
    for slot in diagram.slots:
        frame = diagram.get_slot_frame(slot)
        k = sum([0 if x is None else 1 for x in frame])
        n = len(frame)
        slot.alternatives = len(lexicon.lengths[n]) ** ((n - k)  / n) # lexicon.count_possibilities(frame)
    empty_slots.sort(key=lambda slot: slot.alternatives)
    slot = empty_slots.pop(0)
    frame = diagram.get_slot_frame(slot)
    for word in lexicon.select_word(frame):
        if word in blacklist:
            continue
        slot.fill(word)
        diagram.fill(slot)
        if generate_aux(diagram, lexicon, {word}.union(blacklist)):
            # All slots were filled, we can return safely
            return True
    # If we are here, then all possibilities are exhausted
    # Let's try another word a the previous depth
    slot.filled = False
    diagram.refill()
    return False


def generate(diagram, lexicon):
    for slot in diagram.slots:
        slot.alternatives = len(lexicon.lengths[slot.length])
    generate_aux(diagram, lexicon)


def main():
    diagram = Diagram(5, 5, 0)
    # print(diagram)
    # print(diagram.start_squares)
    # print("\n".join(map(str, diagram.slots)))
    with open("lexicon.json", "r", encoding="utf8") as file:
        lexicon = Lexicon(json.load(file))
    # print(lexicon.select_word(["B", "O", "N", "J", "A", None, None]))
    try:
        generate(diagram, lexicon)
    except KeyboardInterrupt:
        pass    
    print(diagram)


if __name__ == "__main__":
    main()