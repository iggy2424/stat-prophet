"""Player name normalisation for matching names across providers.

"Luka Dončić", "Jaren Jackson Jr." and "Shai Gilgeous-Alexander" must match how
sportsbooks write them, so every stored player gets a search_name built here.
"""
import re
import unicodedata

SUFFIXES = {"jr", "sr", "ii", "iii", "iv", "v"}


def search_name(name: str) -> str:
    text = unicodedata.normalize("NFKD", name or "").encode("ascii", "ignore").decode()
    text = text.lower().replace("-", " ")
    text = re.sub(r"[^a-z ]", "", text)
    words = [w for w in text.split() if w not in SUFFIXES]
    return " ".join(words)
