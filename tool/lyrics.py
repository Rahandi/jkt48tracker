"""
Scrape JKT48 lyrics from three sources and save to song-lyrics.json.

Sources (tried in order per song):
  1. lirik.kapanlagi.com  — Indonesian lyrics, ~78 JKT48 songs
  2. lyricstranslate.com  — Indonesian translations, ~106 JKT48 songs
  3. utaten.com            — Japanese (AKB48 originals), for stage songs

Usage:
    python tool/lyrics.py           # scrape all matchable songs
    python tool/lyrics.py --list    # dry run — show matches without fetching
"""

import json
import re
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

HEADERS = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"}
OUTPUT = Path(__file__).parent.parent / "frontend/src/data/song-lyrics.json"
TRACKLIST = Path(__file__).parent.parent / "frontend/src/data/setlist-tracklists.json"

# ── Common particles to exclude from word-overlap matching ─────────────────────
PARTICLES = {
    "no", "ni", "wo", "wa", "to", "ga", "mo", "na", "ka", "de", "ya",
    "made", "kara", "yo", "ne", "ha", "o", "e", "te", "da", "sa", "ze",
    "zo", "n", "ng", "in", "di", "dan", "yang", "ke", "se", "tachi",
    "chan", "kun", "san",
}


# ══════════════════════════════════════════════════════════════════════════════
# SOURCE 1 — lirik.kapanlagi.com
# ══════════════════════════════════════════════════════════════════════════════

KL_ARTIST_PAGES = [
    "https://lirik.kapanlagi.com/artis/jkt48/",
    "https://lirik.kapanlagi.com/artis/jkt48/index2.html",
    "https://lirik.kapanlagi.com/artis/jkt48/index3.html",
]

# Explicit song-name → kapanlagi URL overrides / blocks (None = skip)
KL_MANUAL: dict[str, str | None] = {
    "Aitakatta": "https://lirik.kapanlagi.com/artis/jkt48/aitakatta/",
    "Futari Nori no Jitensha": "https://lirik.kapanlagi.com/artis/jkt48/bersepeda-berdua-futari-nori-no-jite/",
    "Gingham Check": "https://lirik.kapanlagi.com/artis/jkt48/gingham-check/",
    "Heavy Rotation": "https://lirik.kapanlagi.com/artis/jkt48/heavy-rotation/",
    "RIVER": "https://lirik.kapanlagi.com/artis/jkt48/river/",
    "Koi Suru Fortune Cookie": "https://lirik.kapanlagi.com/artis/jkt48/fortune-cookie-in-love/",
    "365nichi no Kamihikouki": "https://lirik.kapanlagi.com/artis/jkt48/pesawat-kertas-365-hari/",
    "Boku no Taiyou": "https://lirik.kapanlagi.com/artis/jkt48/boku-no-taiyou-matahari-milikku/",
    "Boku no Sakura": "https://lirik.kapanlagi.com/artis/jkt48/bunga-sakuraku-boku-no-sakura/",
    "Boku to Juliet to Jet Coaster": "https://lirik.kapanlagi.com/artis/jkt48/aku-juliet-dan-jet-coaster/",
    "Hissatsu Teleport": "https://lirik.kapanlagi.com/artis/jkt48/jurus-rahasia-teleport-hissatsu-teleport/",
    "Renai Kinshi Jourei": "https://lirik.kapanlagi.com/artis/jkt48/renai-kinshi-jourei-aturan-anti-cinta/",
    "Kimi no Koto ga Suki Dakara": "https://lirik.kapanlagi.com/artis/jkt48/karena-ku-suka-dirimu-kimi-no-koto-ga-suki-dakara/",
    "Tooku ni Ite mo": "https://lirik.kapanlagi.com/artis/jkt48/di-tempat-yang-jauh-pun-tooku-ni-itemo/",
    "Tsugi no Season": "https://lirik.kapanlagi.com/artis/jkt48/musim-yang-selanjutnya-tsugi-no-season/",
    "Namida no Shinkokyuu": "https://lirik.kapanlagi.com/artis/jkt48/namida-no-shinkokyuu-nafas-dalam-air-mata/",
    "Nagai Hikari": "https://lirik.kapanlagi.com/artis/jkt48/nagai-hikari-cahaya-yang-panjang/",
    "Oogoe Diamond": "https://lirik.kapanlagi.com/artis/jkt48/oogoe-diamond-teriakan-berlian/",
    "Sakura no Hanabiratachi": "https://lirik.kapanlagi.com/artis/jkt48/sakura-no-hanabiratachi-kelopak-kelopak-bunga-sakura/",
    "Heart Gata Virus": "https://lirik.kapanlagi.com/artis/jkt48/heart-gata-virus-virus-tipe-hati/",
    "JK Nemurihime": "https://lirik.kapanlagi.com/artis/jkt48/jk-nemurihime-gadis-sma-putri-tidur/",
    "JKT Sanjou!": "https://lirik.kapanlagi.com/artis/jkt48/jkt-sanjou-jkt-tiba/",
    "Idol Nante Yobanaide": "https://lirik.kapanlagi.com/artis/jkt48/idol-nante-yobenaide-jangan-panggil-aku-idol/",
    "Himawari": "https://lirik.kapanlagi.com/artis/jkt48/himawari-bunga-matahari/",
    "Kuroi Tenshi": "https://lirik.kapanlagi.com/artis/jkt48/kuroi-tenshi-malaikat-hitam/",
    "Shonichi": "https://lirik.kapanlagi.com/artis/jkt48/shonichi-hari-pertama/",
    "Ponytail to Shushu": "https://lirik.kapanlagi.com/artis/jkt48/ponytail-to-shushu/",
    "Yuuhi wo Miteiru ka?": "https://lirik.kapanlagi.com/artis/jkt48/yuuhi-wo-miteiru-ka-apakah-kau-melihat-mentari-senja/",
    "Yuuhi wo miteiru ka?": "https://lirik.kapanlagi.com/artis/jkt48/yuuhi-wo-miteiru-ka-apakah-kau-melihat-mentari-senja/",
    "Squall no Aida ni": "https://lirik.kapanlagi.com/artis/jkt48/squall-no-aida-ni-di-tengah-hujan-badai-tiba-tiba/",
    "Tsundere!": "https://lirik.kapanlagi.com/artis/jkt48/tsundere/",
    "Takeuchi Senpai": "https://lirik.kapanlagi.com/artis/jkt48/takeuchi-senpai-kakak-kelasku/",
    "Kiss Shite Son Shichatta": "https://lirik.kapanlagi.com/artis/jkt48/rugi-sudah-dicium-kamu-kiss-shite-son-shichatta/",
    "Magic Hour": "https://lirik.kapanlagi.com/artis/jkt48/magic-hour/",
    "Mirai no Kajitsu": "https://lirik.kapanlagi.com/artis/jkt48/mirai-no-kajitsu-buah-harapan/",
    "Ano Koro no Sneaker": "https://lirik.kapanlagi.com/artis/jkt48/ano-koro-no-sneakers-sneakers-waktu-itu/",
    "Rapsodi": "https://lirik.kapanlagi.com/artis/jkt48/rapsodi/",
    "Lay down": "https://lirik.kapanlagi.com/artis/jkt48/lay-down/",
    "BINGO!": "https://lirik.kapanlagi.com/artis/jkt48/bingo/",
    "Beginner": "https://lirik.kapanlagi.com/artis/jkt48/beginner/",
    "Halloween Night": "https://lirik.kapanlagi.com/artis/jkt48/halloween-night/",
    "Baby! Baby! Baby!": "https://lirik.kapanlagi.com/artis/jkt48/baby-baby-baby/",
    "1!2!3!4! YOROSHIKU!": "https://lirik.kapanlagi.com/artis/jkt48/1-2-3-4-yoroshiku/",
    "109": "https://lirik.kapanlagi.com/artis/jkt48/109-marukyuu/",
    "Flying High": "https://lirik.kapanlagi.com/artis/jkt48/flying-high/",
    "RUN RUN RUN": "https://lirik.kapanlagi.com/artis/jkt48/run-run-run/",
    "Switch": "https://lirik.kapanlagi.com/artis/jkt48/switch/",
    "Viva! Hurricane": "https://lirik.kapanlagi.com/artis/jkt48/viva-hurricane/",
    "UZA": "https://lirik.kapanlagi.com/artis/jkt48/uza/",
    "Cinta di Garis Horizon": "https://lirik.kapanlagi.com/artis/jkt48/cinta-di-garis-horizon/",
    "JKT48": "https://lirik.kapanlagi.com/artis/jkt48/jkt48/",
    "Deja Vu": "https://lirik.kapanlagi.com/artis/jkt48/deja-vu/",
    "Oh My Pumpkin!": "https://lirik.kapanlagi.com/artis/jkt48/oh-my-pumpkin/",
    "Sayonara Crawl": "https://lirik.kapanlagi.com/artis/jkt48/sayonara-crawl/",
    "Kitagawa Kenji": "https://lirik.kapanlagi.com/artis/jkt48/kitagawa-kenji/",
    "Dreamin' girls": "https://lirik.kapanlagi.com/artis/jkt48/dreamin-girls/",
    "Ada Aku!": "https://lirik.kapanlagi.com/artis/jkt48/ada-aku/",
    "Sakura no Shiori": "https://lirik.kapanlagi.com/artis/jkt48/sakura-no-shiori-pembatas-buku-sakura/",
    # Blocks
    "Ima Kimi to Irareru Koto": None,
    "Suki Suki Suki": None,
}


def _normalize(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^\w\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def _meaningful_words(s: str) -> set[str]:
    return {w for w in _normalize(s).split() if w not in PARTICLES and len(w) > 1}


def _kl_fetch_index() -> dict[str, str]:
    songs: dict[str, str] = {}
    for page_url in KL_ARTIST_PAGES:
        r = requests.get(page_url, headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        for a in soup.find_all("a", href=lambda h: h and "/artis/jkt48/" in h and h.endswith("/")):
            title = a.get_text(strip=True)
            href = a["href"]
            if title and href and title not in ("2", "3", "4"):
                songs[_normalize(title)] = href
        time.sleep(0.5)
    return songs


def _kl_find_match(song_name: str, index: dict[str, str]) -> str | None:
    norm = _normalize(song_name)
    our_words = _meaningful_words(song_name)
    if not our_words:
        return None
    if norm in index:
        return index[norm]
    best_url: str | None = None
    best_score = 0
    for kn, url in index.items():
        overlap = our_words & _meaningful_words(kn)
        if len(overlap) >= min(2, len(our_words)) and len(overlap) / len(our_words) >= 0.5:
            if len(overlap) > best_score:
                best_score = len(overlap)
                best_url = url
    return best_url


def _kl_extract_lyrics(url: str) -> str | None:
    r = requests.get(url, headers=HEADERS, timeout=15)
    soup = BeautifulSoup(r.text, "html.parser")
    lyric_div = soup.find("div", class_=lambda c: c and "lyrics-body" in c)
    if not lyric_div:
        return None
    lines: list[str] = []
    for child in lyric_div.children:
        if getattr(child, "name", None) == "br":
            if lines and lines[-1] != "":
                lines.append("")
        elif getattr(child, "name", None) == "span" and "lirik_line" in child.get("class", []):
            text = child.get_text(strip=True)
            if text:
                lines.append(text)
    while lines and lines[0] == "":
        lines.pop(0)
    while lines and lines[-1] == "":
        lines.pop()
    return "\n".join(lines) if lines else None


# ══════════════════════════════════════════════════════════════════════════════
# SOURCE 2 — lyricstranslate.com
# ══════════════════════════════════════════════════════════════════════════════

LT_BASE = "https://lyricstranslate.com"

# Explicit song-name → lyricstranslate URL (None = skip)
LT_MANUAL: dict[str, str | None] = {
    "Bara no Kajitsu": f"{LT_BASE}/en/jkt48-bara-no-kajitsu-buah-mawar-lyrics.html",
    "Aozora no Soba ni Ite": f"{LT_BASE}/en/jkt48-aozora-no-soba-ni-ite-tetaplah-ada-di-lang-lyrics.html",
    "First Rabbit": f"{LT_BASE}/en/jkt48-first-rabbit-lyrics.html",
    "Kibouteki Refrain": f"{LT_BASE}/en/jkt48-kibouteki-refrain-refrain-yang-penuh-harap-lyrics.html",
    "Kaze wa Fuiteiru": f"{LT_BASE}/en/jkt48-kaze-wa-fuiteiru-angin-sedang-berhembus-lyrics.html",
    "Kataomoi Finally": f"{LT_BASE}/en/jkt48-kataomoi-finally-cinta-tak-berbalas-finall-lyrics.html",
    "Kimi to Boku no Kankei": f"{LT_BASE}/en/jkt48-kimi-boku-no-kankei-hubungan-kau-dan-ak-lyrics.html",
    "Kimi to Niji to Taiyou to": f"{LT_BASE}/en/jkt48-kimi-niji-taiyou-bersama-kamu-pe-lyrics.html",
    "Kimi no Senaka": f"{LT_BASE}/en/jkt48-kimi-no-senaka-punggung-milikmu-lyrics.html",
    "Mirai no Tobira": f"{LT_BASE}/en/jkt48-mirai-no-tobira-pintu-masa-depan-lyrics.html",
    "Kiss Datte Hidarikiki": f"{LT_BASE}/en/jkt48-kiss-datte-hidarikiki-ciuman-juga-kidal-lyrics.html",
    "Kiss Date Hidarikiki": f"{LT_BASE}/en/jkt48-kiss-datte-hidarikiki-ciuman-juga-kidal-lyrics.html",
    "Manatsu no Sounds Good!": f"{LT_BASE}/en/jkt48-manatsu-no-sounds-good-musim-panas-sounds-lyrics.html",
    "Seishun no Lap Time": f"{LT_BASE}/en/jkt48-seishun-no-lap-time-laptime-masa-remaja-lyrics.html",
    "Hatsukoi Butterfly": f"{LT_BASE}/en/jkt48-hatsukoi-butterfly-cinta-pertama-butterfly-lyrics.html",
    "Seventeen": f"{LT_BASE}/en/jkt48-seventeen-lyrics",
    "Akai Pin Heel to Professor": f"{LT_BASE}/en/jkt48-pin-heel-merah-dan-profes-lyrics",
    "Avocado Janeshi...": f"{LT_BASE}/en/jkt48-avocado-janeshi-bukan-alpukat-lyrics.html",
    "Fushidara na Natsu": f"{LT_BASE}/en/jkt48-fushidara-na-natsu-musim-panas-yang-kacau-lyrics.html",
    "Iiwake Maybe": f"{LT_BASE}/en/jkt48-iiwake-maybe-alasanku-maybe-lyrics.html",
    "Eien Pressure": f"{LT_BASE}/en/jkt48-eien-pressure-selamanya-pressure-lyrics.html",
    "Kegarete Iru Shinjitsu": f"{LT_BASE}/en/jkt48-kegarete-iru-shinjitsu-kenyataan-yang-tern-lyrics.html",
    "Suki! Suki! Skip!": f"{LT_BASE}/en/jkt48-suki-suki-skip-suka-suka-skip-lyrics.html",
    "Gomen ne, SUMMER": f"{LT_BASE}/en/jkt48-gomenne-summer-maafkan-summer-lyrics.html",
    "Takane no Ringo": f"{LT_BASE}/en/jkt48-takane-no-ringo-apel-yang-ada-di-puncak-lyrics.html",
    "Nagiichi": f"{LT_BASE}/en/jkt48-nagiichi-gadis-yang-paling-cantik-di-pingg-lyrics.html",
    "Melon Juice": f"{LT_BASE}/en/jkt48-melon-juice-lyrics.html",
    "Only Today": f"{LT_BASE}/en/jkt48-only-today-lyrics.html",
    "Only today": f"{LT_BASE}/en/jkt48-only-today-lyrics.html",
    "Migi e Magare!": f"{LT_BASE}/en/jkt48-migi-e-magare-beloklah-ke-kanan-lyrics.html",
    "Migikata": f"{LT_BASE}/en/jkt48-migikata-pundak-kanan-lyrics.html",
    "Flying Get": f"{LT_BASE}/en/jkt48-flying-get-lyrics.html",
    "Kimi ni Au Tabi Koi wo Suru": f"{LT_BASE}/en/jkt48-kimi-ni-au-tabi-koi-wo-suru-jatuh-cinta-se-lyrics.html",
    "Kimi ni Autabi Koi wo Suru": f"{LT_BASE}/en/jkt48-kimi-ni-au-tabi-koi-wo-suru-jatuh-cinta-se-lyrics.html",
    "Virgin love": f"{LT_BASE}/en/jkt48-virgin-love-new-era-version-lyrics.html",
    "Oboete Kudasai": f"{LT_BASE}/en/jkt48-tolong-ingatlah-oboete-k-lyrics",
    "Oshibe to Meshibe to Yoru no Chouchou": f"{LT_BASE}/en/jkt48-oshibe-meshibe-yoru-no-chou-chou-ben-lyrics.html",
    "Kokoro no Placard": f"{LT_BASE}/en/jkt48-papan-penanda-isi-hati-message-placar-lyrics.html",
    "High Tension": f"{LT_BASE}/en/jkt48-high-tension-lyrics.html",
    "Flying Get": f"{LT_BASE}/en/jkt48-flying-get-lyrics.html",
    "So Long!": f"{LT_BASE}/en/jkt48-so-long-lyrics.html",
    "Everyday, Kachuusha": f"{LT_BASE}/en/jkt48-everyday-kachuusha-lyrics.html",
    "Teacher Teacher": f"{LT_BASE}/en/jkt48-teacher-teacher-lyrics.html",
    "UZA": f"{LT_BASE}/en/jkt48-uza-lyrics.html",
    "Kimi ga Oshiete Kureta": f"{LT_BASE}/en/jkt48-anata-ga-ite-kureta-kara-karena-kau-ada-un-lyrics.html",
    "Junjou Shugi": f"{LT_BASE}/en/jkt48-junjou-u-19-kesucian-hati-hingga-umur-19-t-lyrics.html",
    "Kyusen Kyotei": f"{LT_BASE}/en/jkt48-kyusen-kyotei-kesepakatan-genjatan-senjata-lyrics.html",
    "Mae Shika Mukanee": f"{LT_BASE}/en/jkt48-mae-shika-mukanee-hanya-lihat-ke-depan-lyrics.html",
    "LOVE TRIP": f"{LT_BASE}/en/jkt48-love-trip-lyrics.html",
}


def _lt_extract_lyrics(url: str) -> str | None:
    r = requests.get(url, headers=HEADERS, timeout=40)
    if r.status_code != 200:
        return None
    soup = BeautifulSoup(r.text, "html.parser")
    if "Page not found" in (soup.title.string or ""):
        return None
    pars = soup.find_all(class_="par")
    if not pars:
        return None
    stanzas: list[str] = []
    for p in pars:
        lines = [l.strip() for l in p.get_text("\n").split("\n") if l.strip()]
        if lines:
            stanzas.append("\n".join(lines))
    result = "\n\n".join(stanzas)
    return result if result.strip() else None


# ══════════════════════════════════════════════════════════════════════════════
# SOURCE 3 — utaten.com (Japanese AKB48 originals)
# ══════════════════════════════════════════════════════════════════════════════

UT_BASE = "https://utaten.com/lyric/AKB48"

# song name → utaten URL
UT_MANUAL: dict[str, str] = {
    # Songs available via AKB48/title/ path
    "Shoujotachi yo":           f"{UT_BASE}/少女たちよ/",
    "Temodemo no Namida":       f"{UT_BASE}/てもでもの涙/",
    "Pajama Drive":             f"{UT_BASE}/パジャマドライブ/",
    "Skirt, Hirari":            f"{UT_BASE}/スカート、ひらり/",
    "Rider":                    f"{UT_BASE}/ライダー/",
    "Arashi no Yoru ni wa":     f"{UT_BASE}/嵐の夜には/",
    "Sakurairo no Sora no Shita de": f"{UT_BASE}/桜色の空の下で/",
    "Namida no SeeSaw Game":    f"{UT_BASE}/涙のシーソーゲーム/",
    "Namida no Shounan":        f"{UT_BASE}/涙の湘南/",
    "Namida Uri no Shoujo":     f"{UT_BASE}/涙売りの少女/",
    "Ame no Doubutsuen":        f"{UT_BASE}/雨の動物園/",
    "Nagisa no CHERRY":         f"{UT_BASE}/渚のCHERRY/",
    "Seifuku ga Jama wo Suru":  f"{UT_BASE}/制服が邪魔をする/",
    "Seishun Girls":            f"{UT_BASE}/青春ガールズ/",
    "Shamu Neko":               f"{UT_BASE}/シャムネコ/",
    "Nageki no Figure":         f"{UT_BASE}/嘆きのフィギュア/",
    "Kuchi Utsushi no Chocolate": f"{UT_BASE}/口移しのチョコレート/",
    "Dakishimeraretara":        f"{UT_BASE}/抱きしめられたら/",
    "Romance Kakurenbo":        f"{UT_BASE}/ロマンスかくれんぼ/",
    "PARTY ga Hajimaru yo":     f"{UT_BASE}/PARTYが始まるよ/",
    "Manatsu no Christmas Rose": f"{UT_BASE}/真夏のクリスマスローズ/",
    "Hatsukoi Dorobou":         f"{UT_BASE}/初恋泥棒/",
    "Haru ga Kuru Made":        f"{UT_BASE}/春が来るまで/",
    "Sobakasu no Kiss":         f"{UT_BASE}/そばかすのキス/",
    "Mushi no Ballad":          f"{UT_BASE}/虫のバラード/",
    "Yakusoku yo":              f"{UT_BASE}/約束よ/",
    "Korogaru Ishi ni Nare":    f"{UT_BASE}/転がる石になれ/",
    "Inochi no Tsukaimichi":    f"{UT_BASE}/命の使い道/",
    "Itoshiki Natasha":         f"{UT_BASE}/愛しきナターシャ/",
    "Theater no Megami":        f"{UT_BASE}/シアターの女神/",
    "Cinderella wa Damasarenai": f"{UT_BASE}/シンデレラは騙されない/",
    "Senaka Kara Dakishimete":  f"{UT_BASE}/背中から抱きしめて/",
    # Songs listed under other groups — use ID-based URLs from search
    "12byou":                   "https://utaten.com/lyric/sa15041344/",
    "Aisatsu kara Hajimeyou":   "https://utaten.com/lyric/to15030302/",
    "Ame no Pianist":           "https://utaten.com/lyric/jb51005370/",
    "Aozora Kataomoi":          "https://utaten.com/lyric/jb71002167/",
    "Banzai Venus":             "https://utaten.com/lyric/jb71103065/",
    "Beach Sandal":             "https://utaten.com/lyric/jb51170124/",
    "Bokura no Kaze":           "https://utaten.com/lyric/jb51005363/",
    "Chime wa LOVE SONG":       "https://utaten.com/lyric/jb51005366/",
    "Dareka no Tame ni":        "https://utaten.com/lyric/mi21050820/",
    "Hatsukoi Dash":            "https://utaten.com/lyric/jb71009298/",
    "Hikoukigumo":              "https://utaten.com/lyric/mi21100511/",
    "Juuryoku Sympathy":        "https://utaten.com/lyric/jb81209009/",
    "Keibetsu Shiteita Aijou":  "https://utaten.com/lyric/jb10704054/",
    "Kinjirareta Futari":       "https://utaten.com/lyric/yk15082649/",
    "Kuma no Nuigurumi":        "https://utaten.com/lyric/xn15020449/",
    "Namida Surprise!":         "https://utaten.com/lyric/jb70906320/",
    "Ookami to Pride":          "https://utaten.com/lyric/jb81004008/",
    "Pareo wa Emerald":         "https://utaten.com/lyric/jb71107127/",
    "Seifuku no Me":            "https://utaten.com/lyric/jb81004006/",
    "Te wo Tsunaginagara":      "https://utaten.com/lyric/jb51005365/",
    "Tenohira":                 "https://utaten.com/lyric/ye16020111/",
    "Utsukushii Inazuma":       "https://utaten.com/lyric/jb71307052/",
}


def _ut_extract_lyrics(url: str) -> str | None:
    """Fetch utaten page and return clean Japanese lyrics (no furigana)."""
    r = requests.get(url, headers=HEADERS, timeout=20)
    if r.status_code != 200:
        return None
    soup = BeautifulSoup(r.text, "html.parser")
    # Remove furigana readings (rt spans)
    for rt in soup.find_all(class_="rt"):
        rt.decompose()
    lyric_div = soup.find(class_="hiragana")
    if not lyric_div:
        return None
    lines: list[str] = []
    for child in lyric_div.descendants:
        if getattr(child, "name", None) == "br":
            lines.append("")
        elif hasattr(child, "name") and child.name is None:  # NavigableString
            text = str(child).strip()
            if text:
                if lines and lines[-1] == "":
                    lines[-1] = text
                else:
                    if lines:
                        lines[-1] = lines[-1] + text
                    else:
                        lines.append(text)
    # Collapse into stanzas: multiple blanks → single blank
    result: list[str] = []
    prev_blank = False
    for l in lines:
        if l == "":
            if not prev_blank and result:
                result.append("")
            prev_blank = True
        else:
            result.append(l)
            prev_blank = False
    while result and result[0] == "":
        result.pop(0)
    while result and result[-1] == "":
        result.pop()
    return "\n".join(result) if result else None


# ══════════════════════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════════════════════

def build_song_list() -> list[str]:
    data = json.loads(TRACKLIST.read_text())
    songs: set[str] = set()
    for setlist in data.values():
        for s in setlist["songs"]:
            if s["name"] not in ("Overture", "overture"):
                songs.add(s["name"])
    return sorted(songs)


def run(dry_run: bool = False) -> None:
    existing: dict[str, dict] = {}
    if OUTPUT.exists():
        existing = json.loads(OUTPUT.read_text())

    songs = build_song_list()
    missing = [s for s in songs if s not in existing]
    print(f"Songs in tracklist: {len(songs)}")
    print(f"Already stored:     {len(existing)}")
    print(f"Need to fetch:      {len(missing)}\n")

    # Build kapanlagi auto-index once
    print("Fetching kapanlagi index...", flush=True)
    kl_index = _kl_fetch_index()
    print(f"  {len(kl_index)} kapanlagi songs indexed\n")

    matched = skipped = failed = 0

    for song in missing:
        # ── Determine source URL ──────────────────────────────────────────────
        url: str | None = None
        source_name = ""

        kl_blocked = song in KL_MANUAL and KL_MANUAL[song] is None

        # 1. kapanlagi explicit URL
        if song in KL_MANUAL and KL_MANUAL[song] is not None:
            url = KL_MANUAL[song]
            source_name = "kapanlagi"
        # 2. kapanlagi auto-match (only if not explicitly blocked)
        if url is None and not kl_blocked:
            url = _kl_find_match(song, kl_index)
            if url:
                source_name = "kapanlagi"
        # 3. lyricstranslate explicit map (None = skip)
        if url is None and song in LT_MANUAL and LT_MANUAL[song] is not None:
            url = LT_MANUAL[song]
            source_name = "lyricstranslate"
        # 4. utaten (Japanese AKB48 originals)
        if url is None and song in UT_MANUAL:
            url = UT_MANUAL[song]
            source_name = "utaten"

        if url is None:
            continue

        if dry_run:
            print(f"  [{source_name}] {song!r} -> {url}")
            matched += 1
            continue

        print(f"  [{source_name}] {song!r}", end="", flush=True)

        try:
            if source_name == "kapanlagi":
                lyrics = _kl_extract_lyrics(url)
            elif source_name == "lyricstranslate":
                lyrics = _lt_extract_lyrics(url)
            else:
                lyrics = _ut_extract_lyrics(url)
        except Exception as e:
            print(f" ERROR: {e}")
            failed += 1
            time.sleep(1)
            continue

        if not lyrics:
            print(" (no lyrics found)")
            failed += 1
            time.sleep(0.5)
            continue

        existing[song] = {"source": url, "lyrics": lyrics}
        OUTPUT.write_text(json.dumps(existing, ensure_ascii=False, indent=2))
        print(f" OK ({len(lyrics.splitlines())} lines)")
        matched += 1
        time.sleep(1.0)

    print(f"\nDone. matched={matched} skipped={skipped} failed={failed}")
    print(f"Total stored: {len(existing)}")
    print(f"Output: {OUTPUT}")


if __name__ == "__main__":
    run(dry_run="--list" in sys.argv)
