"""
retheme.py: switches BalaHader from the green theme to the warm coral theme.

Run ONCE from the client folder:

    cd BalaHader\\client
    python retheme.py

It rewrites the colors inside src/ and index.html. It is safe to run twice
(colors that were already changed are left alone). To change a color later,
edit the PALETTE / MAP below or just edit the hex in your files.

New palette
    Primary coral      #E85D3F      Main headings   #3A2925
    Coral hover        #C9472E      Body text       #71605A
    Golden highlight   #F6B73C      Background      #FFF9EE
    Apricot accent     #FF9F68      Light section   #FFF0E5
    Cards              #FFFFFF      Borders         #EEDFD3
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FLAGS = re.IGNORECASE

# 1) Context rules: run first, most specific wins.
CONTEXT = [
    # hover states that used the dark green become the deeper coral
    (r"hover:bg-\[#163D2B\]", "hover:bg-[#C9472E]"),
    (r"hover:border-\[#163D2B\]", "hover:border-[#C9472E]"),
    # coloured TEXT uses the deeper coral so small links stay readable
    (r"text-\[#27833F\]", "text-[#C9472E]"),
    # eyebrow labels (small uppercase text) that were orange
    (r"(text-xs[^\"'`]*?)text-\[#E5722A\]", r"\1text-[#C9472E]"),
    # the orange call-to-action buttons become the primary coral
    (r"bg-\[#E5722A\]", "bg-[#E85D3F]"),
    (r"hover:bg-\[#c45e20\]", "hover:bg-[#C9472E]"),
    # Badge: keep "orange" distinct from the (now coral) default by making it golden
    (r"orange: 'bg-\[#FFF0E8\] text-\[#B8571D\] ring-\[#E5722A\]/25'",
     "orange: 'bg-[#FFF6DD] text-[#8A5A00] ring-[#F6B73C]/40'"),
]

# 2) Every other old color -> new color.
MAP = {
    "27833f": "E85D3F",  # primary
    "163d2b": "3A2925",  # dark backgrounds + headings
    "10213d": "3A2925",  # main headings
    "6b7a6e": "71605A",  # body text
    "51645a": "71605A",
    "dde8d8": "EEDFD3",  # borders
    "ebf5ec": "FFF0E5",  # tinted backgrounds
    "f2f7ef": "FFF0E5",
    "faf8f4": "FFF9EE",  # page background
    "f7faf5": "FFF9EE",
    "faf8f2": "FFF9EE",
    "1f6b33": "C9472E",
    "7fd08f": "F6B73C",  # highlights on dark backgrounds
    "c9dcc9": "F0DFD2",  # light text on dark backgrounds
    "b9d2c0": "E3CFC2",
    "9db8a6": "C9B3A6",
    "8fa997": "B8A196",
    "9aa79d": "9C8A82",
    "e5722a": "E85D3F",
    "c45e20": "C9472E",
    "c96846": "E85D3F",
    "b8571d": "C9472E",
    "fff0e8": "FFF0E5",
    "fff8f3": "FFF9EE",
    "f4d9c9": "EEDFD3",
    "7a4a2a": "71605A",
}

RGB = {"rgb(22 61 43": "rgb(58 41 37", "rgb(39 131 63": "rgb(232 93 63"}

TOKENS = """  --color-coral: #e85d3f;
  --color-coral-deep: #c9472e;
  --color-honey: #f6b73c;
  --color-apricot: #ff9f68;
  --color-cocoa: #3a2925;
  --color-warm-gray: #71605a;
  --color-vanilla: #fff9ee;
  --color-peach: #fff0e5;
  --color-beige: #eedfd3;
"""


def convert(text, is_css):
    if is_css:
        text = re.sub(r"(?:  --color-[a-z-]+: #[0-9a-fA-F]{6};\r?\n)+", TOKENS, text, count=1)
        text = text.replace("var(--color-cream)", "var(--color-vanilla)")
        text = text.replace("var(--color-ink)", "var(--color-cocoa)")
    for pattern, repl in CONTEXT:
        text = re.sub(pattern, repl, text, flags=FLAGS)
    text = re.sub(
        r"#([0-9a-fA-F]{6})\b",
        lambda m: "#" + MAP[m.group(1).lower()] if m.group(1).lower() in MAP else m.group(0),
        text,
    )
    for old, new in RGB.items():
        text = text.replace(old, new)
    return text


def main():
    files = [ROOT / "index.html"] + [
        p for p in (ROOT / "src").rglob("*")
        if p.suffix in {".tsx", ".ts", ".css"} and "assets" not in p.parts
    ]
    changed = 0
    for path in files:
        if not path.exists():
            continue
        original = path.read_bytes().decode("utf-8")
        updated = convert(original, path.suffix == ".css")
        if updated != original:
            path.write_bytes(updated.encode("utf-8"))
            changed += 1
            print("updated", path.relative_to(ROOT))
    print(f"\nDone. {changed} files updated.")


if __name__ == "__main__":
    main()
