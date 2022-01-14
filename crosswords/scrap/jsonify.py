import argparse
import os
import json


def jsonify(input_path):
    lexicon = list()
    with open(input_path, "r", encoding="utf8") as file:
        for line in file.readlines():
            word, *clues = line.strip().split("\t")
            lexicon.append({
                "word": word,
                "clues": clues
            })
    with open(os.path.splitext(input_path)[0] + ".json", "w", encoding="utf8") as file:
        json.dump({"lexicon": lexicon}, file)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=str)
    args = parser.parse_args()
    jsonify(args.input)


if __name__ == "__main__":
    main()