import requests
import bs4
import json

index_url = "https://mots-croises-solutions.com/solution-codycross/Inventions/"

soup = bs4.BeautifulSoup(requests.get(index_url).text, features="html.parser")

entries = []

for ol in soup.find("div", {"id": "content"}).find("div", {"class": "s-block"}).find("ol", recursive=False).find_all("ol"):
    for li in ol.find_all("li"):
        clue = li.find("a").text.strip()
        sub_soup = bs4.BeautifulSoup(requests.get(li.find("a")["href"]).text, features="html.parser")
        with open("tmp.html", "w", encoding="utf8") as file:
            file.write(str(sub_soup))
        # print(sub_soup)
        word = sub_soup.find("a", {"class": "resultquery"}).text
        entries.append({
            "clue": clue,
            "word": word.upper()
        })
        print(word, clue)
        break
    break

with open("mots-croises-solutions-com.json", "w", encoding="utf8") as file:
    json.dump(entries, file, indent=4)