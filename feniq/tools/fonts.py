"""Build the site's web fonts from the Google Fonts sources.

    pip install fonttools brotli
    python3 tools/fonts.py [SOURCE_DIR]

SOURCE_DIR (default tools/.font-src, git-ignored) holds ReadexPro[HEXP,wght].ttf and
IBMPlexSansArabic-{Regular,SemiBold}.ttf from github.com/google/fonts (ofl/readexpro,
ofl/ibmplexsansarabic); they are downloaded there when missing. Both families are
under the SIL Open Font License (assets/fonts/OFL-*.txt).

Each family is split in two files:
  *-ar  Arabic letters, Arabic-Indic digits, and the ASCII digits, spaces and
        punctuation that Arabic text uses. This is the only file an Arabic page needs,
        so it is preloaded.
  *-lat Latin letters, fetched only when Latin text is on screen.
Hinting is dropped and Readex keeps just the weight range the design uses (400-700).
"""
import io
import pathlib
import sys
import urllib.request

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

OUT = pathlib.Path(__file__).resolve().parent.parent / "assets" / "fonts"
SRC = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent / ".font-src")
RAW = "https://raw.githubusercontent.com/google/fonts/main/ofl/"
SOURCES = {
    "ReadexPro[HEXP,wght].ttf": "readexpro/ReadexPro%5BHEXP,wght%5D.ttf",
    "IBMPlexSansArabic-Regular.ttf": "ibmplexsansarabic/IBMPlexSansArabic-Regular.ttf",
    "IBMPlexSansArabic-SemiBold.ttf": "ibmplexsansarabic/IBMPlexSansArabic-SemiBold.ttf",
}

# Kept in sync with the unicode-range descriptors in assets/site.css.
R = lambda a, b: list(range(a, b + 1))
ARABIC = (R(0x0621, 0x063A) + R(0x0640, 0x0652) + R(0x0660, 0x066D)
          + [0x060C, 0x061B, 0x061F, 0x0670, 0x0671, 0x200C, 0x200D, 0x200E, 0x200F])
COMMON = (R(0x20, 0x40) + R(0x5B, 0x60) + R(0x7B, 0x7E)
          + [0xA0, 0xA9, 0xAB, 0xB7, 0xBB, 0xD7, 0x2010, 0x2011, 0x2013, 0x2014,
             0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2026, 0x2212])
LATIN = R(0x41, 0x5A) + R(0x61, 0x7A) + [c for c in R(0xC0, 0xFF) if c not in (0xD7, 0xF7)] + [0x131, 0x152, 0x153]


def fetch():
    SRC.mkdir(parents=True, exist_ok=True)
    for name, path in SOURCES.items():
        if not (SRC / name).exists():
            urllib.request.urlretrieve(RAW + path, SRC / name)


def readex():
    font = TTFont(SRC / "ReadexPro[HEXP,wght].ttf", lazy=False)
    font = instancer.instantiateVariableFont(font, {"HEXP": 0, "wght": (400, 700)})
    buf = io.BytesIO()
    font.save(buf)
    buf.seek(0)
    return TTFont(buf, lazy=False)


def build(load, unicodes, name):
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]  # keep the copyright and licence records
    opts.notdef_outline = True
    opts.hinting = False
    font = load()
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=unicodes)
    sub.subset(font)
    font.flavor = "woff2"
    font.save(OUT / name)
    print(f"{name:22} {(OUT / name).stat().st_size / 1024:5.1f} KB")


def main():
    fetch()
    plex = lambda w: (lambda: TTFont(SRC / f"IBMPlexSansArabic-{w}.ttf", lazy=False))
    build(readex, ARABIC + COMMON, "readex-ar.woff2")
    build(readex, LATIN, "readex-lat.woff2")
    for weight, style in (("400", "Regular"), ("600", "SemiBold")):
        build(plex(style), ARABIC + COMMON, f"plex-ar-{weight}.woff2")
        build(plex(style), LATIN, f"plex-lat-{weight}.woff2")


if __name__ == "__main__":
    main()
