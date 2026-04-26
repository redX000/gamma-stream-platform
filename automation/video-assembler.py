"""
video-assembler.py — Faceless video assembler for Gamma Stream Platform.

Pipeline:
  1. Read voiceover MP3 + word-timing JSON from videos/audio/
  2. Fetch matching stock footage from Pexels API (free tier)
  3. Crop + resize clips to target aspect ratio, loop to fill audio duration
  4. Overlay voiceover audio
  5. Burn subtitles from word timing data (via Pillow + moviepy masks)
  6. Add 2.5s intro title card and 3.5s outro card
  7. Export MP4: 1080x1920 (vertical Shorts) and 1920x1080 (horizontal YouTube)

Outputs:
  videos/output/[date]-[topic]-short.mp4   (vertical, from short audio)
  videos/output/[date]-[topic]-long.mp4    (horizontal, from long audio)

Usage:
  python automation/video-assembler.py
  python automation/video-assembler.py --topic best-ai-tools --date 2026-04-26
  python automation/video-assembler.py --orientation vertical   # Shorts only
"""

import argparse
import json
import os
import shutil
import sys
import textwrap
from pathlib import Path

import numpy as np
import requests
from PIL import Image, ImageDraw, ImageFont
from moviepy.editor import (
    AudioFileClip,
    CompositeVideoClip,
    ImageClip,
    VideoFileClip,
    concatenate_videoclips,
)

# ── Paths ─────────────────────────────────────────────────────────────────────

ROOT = Path(__file__).parent.parent
AUDIO_DIR = ROOT / "videos" / "audio"
SCRIPTS_DIR = ROOT / "videos" / "scripts"
OUTPUT_DIR = ROOT / "videos" / "output"
TEMP_DIR = ROOT / "videos" / "temp"

# ── Video specs ───────────────────────────────────────────────────────────────

VERTICAL = (1080, 1920)    # 9:16 — YouTube Shorts / TikTok
HORIZONTAL = (1920, 1080)  # 16:9 — YouTube standard
FPS = 24

INTRO_DURATION = 2.5   # seconds
OUTRO_DURATION = 3.5   # seconds

# ── Brand colours ─────────────────────────────────────────────────────────────

BG_DARK = (8, 8, 18)
ACCENT = (99, 102, 241)     # indigo
WHITE = (255, 255, 255)

# ── Subtitle tuning ───────────────────────────────────────────────────────────

SUB_WORDS = 4              # words per subtitle chunk
SUB_FONT_SIZE_V = 54       # px — vertical video
SUB_FONT_SIZE_H = 46       # px — horizontal video
SUB_Y_FRAC_V = 0.67        # fraction from top — vertical
SUB_Y_FRAC_H = 0.75        # fraction from top — horizontal
SUB_BG_ALPHA = 175         # 0-255 subtitle pill opacity

# ── Pexels ────────────────────────────────────────────────────────────────────

PEXELS_URL = "https://api.pexels.com/videos/search"


# ─────────────────────────────────────────────────────────────────────────────
# Fonts
# ─────────────────────────────────────────────────────────────────────────────

def _load_font(size: int) -> ImageFont.FreeTypeFont:
    """Find an available bold TrueType font; fall back to PIL default."""
    candidates = [
        # Ubuntu / Debian (GitHub Actions)
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
        # macOS
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/Library/Fonts/Arial Bold.ttf",
        # Windows
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/calibrib.ttf",
        "C:/Windows/Fonts/seguibl.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                pass
    # PIL bitmap fallback — no size param, small but always works
    return ImageFont.load_default()


# ─────────────────────────────────────────────────────────────────────────────
# Pexels: fetch + download clips
# ─────────────────────────────────────────────────────────────────────────────

def _pexels_key() -> str:
    key = os.environ.get("PEXELS_API_KEY", "")
    if not key:
        raise RuntimeError("PEXELS_API_KEY environment variable is not set.")
    return key


def fetch_pexels_clips(query: str, max_clips: int = 8, min_duration: int = 4) -> list[dict]:
    """
    Search Pexels for landscape HD video clips matching query.
    Returns up to max_clips entries: {url, duration, width, height}.
    """
    headers = {"Authorization": _pexels_key()}
    params = {
        "query": query,
        "per_page": 25,
        "orientation": "landscape",  # download landscape; crop to each target ratio later
    }
    r = requests.get(PEXELS_URL, headers=headers, params=params, timeout=30)
    r.raise_for_status()

    results = []
    for video in r.json().get("videos", []):
        if video.get("duration", 0) < min_duration:
            continue

        # Prefer HD (≥1280 wide) MP4; fall back to largest available
        files = [f for f in video.get("video_files", []) if f.get("file_type") == "video/mp4"]
        hd = [f for f in files if f.get("width", 0) >= 1280]
        chosen = min(hd, key=lambda f: abs(f["width"] - 1920)) if hd else (
            max(files, key=lambda f: f.get("width", 0)) if files else None
        )
        if not chosen or not chosen.get("link"):
            continue

        results.append({
            "url": chosen["link"],
            "duration": video["duration"],
            "width": chosen.get("width", 0),
            "height": chosen.get("height", 0),
        })
        if len(results) >= max_clips:
            break

    if not results:
        raise RuntimeError(f'No Pexels videos found for query: "{query}"')

    print(f"[assembler] Pexels: {len(results)} clips for '{query}'")
    return results


def download_clip(url: str, dest: Path) -> None:
    """Stream-download a video file."""
    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 17):  # 128 KB chunks
                f.write(chunk)
    size_mb = dest.stat().st_size / 1_048_576
    print(f"[assembler] Downloaded {dest.name} ({size_mb:.1f} MB)")


# ─────────────────────────────────────────────────────────────────────────────
# Clip preparation
# ─────────────────────────────────────────────────────────────────────────────

def prepare_clip(path: Path, target_size: tuple[int, int]) -> VideoFileClip:
    """Load a clip, center-crop to target aspect ratio, resize."""
    tw, th = target_size
    clip = VideoFileClip(str(path), audio=False)

    src_ratio = clip.w / clip.h
    tgt_ratio = tw / th

    if src_ratio > tgt_ratio:
        # wider than target → crop sides
        new_w = int(clip.h * tgt_ratio)
        x1 = (clip.w - new_w) // 2
        clip = clip.crop(x1=x1, y1=0, x2=x1 + new_w, y2=clip.h)
    elif src_ratio < tgt_ratio:
        # taller than target → crop top/bottom
        new_h = int(clip.w / tgt_ratio)
        y1 = (clip.h - new_h) // 2
        clip = clip.crop(x1=0, y1=y1, x2=clip.w, y2=y1 + new_h)

    return clip.resize((tw, th))


def fill_to_duration(clips: list[VideoFileClip], total: float) -> list[VideoFileClip]:
    """Loop/trim clips until they fill exactly `total` seconds."""
    filled, result, i = 0.0, [], 0
    while filled < total:
        c = clips[i % len(clips)]
        remaining = total - filled
        result.append(c if c.duration <= remaining else c.subclip(0, remaining))
        filled += min(c.duration, remaining)
        i += 1
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Subtitle rendering
# ─────────────────────────────────────────────────────────────────────────────

def _chunk_words(words: list[dict], n: int = SUB_WORDS) -> list[dict]:
    """Group word-timing dicts into subtitle chunks of n words."""
    chunks = []
    for i in range(0, len(words), n):
        g = words[i : i + n]
        chunks.append({"text": " ".join(w["word"] for w in g),
                        "startMs": g[0]["startMs"], "endMs": g[-1]["endMs"]})
    return chunks


def _render_sub_image(text: str, vid_w: int, font_size: int) -> tuple[np.ndarray, np.ndarray]:
    """
    Render a subtitle pill as a PIL RGBA image.
    Returns (rgb_arr uint8, alpha_arr float64 [0,1]) for moviepy's mask system.
    """
    pill_w = int(vid_w * 0.86)
    font = _load_font(font_size)

    # Measure and word-wrap
    wrap_w = max(12, pill_w // (font_size // 2))
    lines = textwrap.wrap(text, width=wrap_w) or [text]

    probe = Image.new("RGBA", (1, 1))
    probe_draw = ImageDraw.Draw(probe)
    lh = probe_draw.textbbox((0, 0), "Ay", font=font)[3] + 6
    pad = 14
    ph = lh * len(lines) + pad * 2

    img = Image.new("RGBA", (pill_w, ph), (0, 0, 0, 0))
    # Semi-transparent pill background
    bg = Image.new("RGBA", (pill_w, ph), (0, 0, 0, SUB_BG_ALPHA))
    img.paste(bg)
    draw = ImageDraw.Draw(img)

    for idx, line in enumerate(lines):
        bb = draw.textbbox((0, 0), line, font=font)
        x = (pill_w - (bb[2] - bb[0])) // 2
        y = pad + idx * lh
        draw.text((x + 2, y + 2), line, font=font, fill=(0, 0, 0, 200))   # shadow
        draw.text((x, y), line, font=font, fill=(255, 255, 255, 255))      # text

    arr = np.array(img)
    return arr[:, :, :3], arr[:, :, 3].astype(float) / 255.0


def make_subtitle_clips(
    timing_path: Path,
    video_size: tuple[int, int],
    audio_offset: float = INTRO_DURATION,
) -> list[ImageClip]:
    """
    Build a list of positioned ImageClips from word-timing JSON.
    audio_offset shifts all timestamps to account for the intro card.
    """
    with open(timing_path) as f:
        data = json.load(f)

    words = data.get("words", [])
    if not words:
        return []

    vw, vh = video_size
    is_vertical = vw < vh
    font_size = SUB_FONT_SIZE_V if is_vertical else SUB_FONT_SIZE_H
    sub_y = int(vh * (SUB_Y_FRAC_V if is_vertical else SUB_Y_FRAC_H))

    clips = []
    for chunk in _chunk_words(words):
        start_s = chunk["startMs"] / 1000 + audio_offset
        dur_s = max((chunk["endMs"] - chunk["startMs"]) / 1000, 0.12)

        rgb, alpha = _render_sub_image(chunk["text"], vw, font_size)

        # moviepy mask approach: set RGB clip + float [0,1] alpha mask
        sub_clip = (
            ImageClip(rgb)
            .set_mask(ImageClip(alpha, ismask=True))
            .set_start(start_s)
            .set_duration(dur_s)
            .set_position(("center", sub_y))
        )
        clips.append(sub_clip)

    return clips


# ─────────────────────────────────────────────────────────────────────────────
# Title / outro cards
# ─────────────────────────────────────────────────────────────────────────────

def _draw_centered(draw, text, font, y, w, color):
    bb = draw.textbbox((0, 0), text, font=font)
    x = (w - (bb[2] - bb[0])) // 2
    draw.text((x + 2, y + 2), text, font=font, fill=(0, 0, 0))
    draw.text((x, y), text, font=font, fill=color)


def make_title_card(title: str, video_size: tuple[int, int], duration: float = INTRO_DURATION) -> ImageClip:
    vw, vh = video_size
    img = Image.new("RGB", (vw, vh), BG_DARK)
    draw = ImageDraw.Draw(img)

    # Accent line
    draw.rectangle([0, vh // 2 - 3, vw, vh // 2 + 3], fill=ACCENT)

    # Title text — break on hyphens and wrap
    display = title.replace("-", " ").title()
    wrap_w = 14 if vh > vw else 26
    font_size = 76 if vh > vw else 60
    font = _load_font(font_size)
    lines = textwrap.wrap(display, width=wrap_w) or [display]
    lh = font_size + 14
    total_h = lh * len(lines)
    start_y = vh // 2 - total_h - 30

    for i, line in enumerate(lines):
        _draw_centered(draw, line, font, start_y + i * lh, vw, WHITE)

    # Site watermark
    small = _load_font(30)
    _draw_centered(draw, "GammaCash.online", small, vh - 110, vw, ACCENT)

    return ImageClip(np.array(img)).set_duration(duration).set_fps(FPS)


def make_outro_card(video_size: tuple[int, int], duration: float = OUTRO_DURATION) -> ImageClip:
    vw, vh = video_size
    img = Image.new("RGB", (vw, vh), BG_DARK)
    draw = ImageDraw.Draw(img)

    mid = vh // 2
    rows = [
        ("Follow for more AI tips!", _load_font(66 if vh > vw else 52), WHITE,    mid - 110),
        ("GammaCash.online",          _load_font(42 if vh > vw else 36), ACCENT,  mid - 10),
        ("New videos every week",     _load_font(30),                    (170, 170, 195), mid + 80),
    ]
    for text, font, color, y in rows:
        _draw_centered(draw, text, font, y, vw, color)

    return ImageClip(np.array(img)).set_duration(duration).set_fps(FPS)


# ─────────────────────────────────────────────────────────────────────────────
# Assembly
# ─────────────────────────────────────────────────────────────────────────────

def assemble(
    topic: str,
    date: str,
    audio_path: Path,
    timing_path: Path,
    keywords: str,
    orientation: str,   # 'vertical' | 'horizontal'
    keep_temp: bool = False,
) -> Path:
    """
    Full pipeline for one orientation.  Returns the output MP4 path.
    """
    video_size = VERTICAL if orientation == "vertical" else HORIZONTAL
    suffix = "short" if orientation == "vertical" else "long"
    out_path = OUTPUT_DIR / f"{date}-{topic}-{suffix}.mp4"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    if out_path.exists():
        print(f"[assembler] Already exists, skipping: {out_path.name}")
        return out_path

    clip_dir = TEMP_DIR / f"{topic}-{suffix}"
    clip_dir.mkdir(parents=True, exist_ok=True)

    prepared: list[VideoFileClip] = []
    audio_clip = None

    try:
        # ── 1. Audio ──────────────────────────────────────────────────────────
        audio_clip = AudioFileClip(str(audio_path))
        audio_duration = audio_clip.duration
        total_duration = INTRO_DURATION + audio_duration + OUTRO_DURATION
        print(f"[assembler] {orientation} | audio {audio_duration:.1f}s → total {total_duration:.1f}s")

        # ── 2. Fetch + download stock clips ───────────────────────────────────
        clip_infos = fetch_pexels_clips(keywords, max_clips=8)
        raw_paths = []
        for i, info in enumerate(clip_infos):
            dest = clip_dir / f"clip_{i:02d}.mp4"
            if not dest.exists():
                download_clip(info["url"], dest)
            raw_paths.append(dest)

        # ── 3. Prepare clips (crop + resize) ──────────────────────────────────
        for p in raw_paths:
            try:
                prepared.append(prepare_clip(p, video_size))
            except Exception as e:
                print(f"[assembler] Warning: skipping {p.name}: {e}")

        if not prepared:
            raise RuntimeError("All clips failed to load — check Pexels downloads.")

        # ── 4. Loop clips to fill body duration ───────────────────────────────
        body_clips = fill_to_duration(prepared, audio_duration)
        body = concatenate_videoclips(body_clips, method="compose")

        # ── 5. Cards ──────────────────────────────────────────────────────────
        intro = make_title_card(topic, video_size)
        outro = make_outro_card(video_size)

        # ── 6. Full video timeline: intro → body → outro ──────────────────────
        full = concatenate_videoclips([intro, body, outro], method="compose")

        # Audio starts after intro card
        full = full.set_audio(audio_clip.set_start(INTRO_DURATION))

        # ── 7. Subtitle overlays ──────────────────────────────────────────────
        sub_clips = make_subtitle_clips(timing_path, video_size)
        if sub_clips:
            full = CompositeVideoClip([full] + sub_clips)

        # ── 8. Export ─────────────────────────────────────────────────────────
        print(f"[assembler] Rendering {out_path.name} ...")
        full.write_videofile(
            str(out_path),
            fps=FPS,
            codec="libx264",
            audio_codec="aac",
            # ultrafast = least CPU time; swap to 'medium' for final quality
            preset="ultrafast",
            ffmpeg_params=["-crf", "28"],
            temp_audiofile=str(TEMP_DIR / f"{topic}-{suffix}-tmp.m4a"),
            remove_temp=True,
            threads=2,
            logger=None,
            verbose=False,
        )

        size_mb = out_path.stat().st_size / 1_048_576
        print(f"[assembler] ✅  {out_path.name} ({size_mb:.1f} MB)")
        return out_path

    finally:
        for c in prepared:
            try:
                c.close()
            except Exception:
                pass
        if audio_clip:
            try:
                audio_clip.close()
            except Exception:
                pass
        if not keep_temp:
            shutil.rmtree(clip_dir, ignore_errors=True)


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Assemble faceless videos from voiceover + stock footage")
    parser.add_argument("--topic",       help="Only process this topic slug (e.g. best-ai-tools)")
    parser.add_argument("--date",        help="Only process this date (YYYY-MM-DD)")
    parser.add_argument("--orientation", choices=["vertical", "horizontal", "both"], default="both")
    parser.add_argument("--keep-temp",   action="store_true", help="Keep downloaded clips after assembly")
    args = parser.parse_args()

    # Discover short audio files to determine which topics to process
    short_files = sorted(AUDIO_DIR.glob("*-short.mp3"))
    if args.date:
        short_files = [f for f in short_files if f.name.startswith(args.date)]
    if args.topic:
        short_files = [f for f in short_files if args.topic in f.name]

    if not short_files:
        print(f"[assembler] No matching audio files in {AUDIO_DIR}")
        sys.exit(1)

    print(f"[assembler] Found {len(short_files)} topic(s) to process\n")
    results: list[Path] = []

    for short_audio in short_files:
        # Filename pattern: YYYY-MM-DD-topic-short.mp3
        stem = short_audio.stem                           # 2026-04-26-best-ai-tools-short
        parts = stem.split("-")
        date = "-".join(parts[:3])                        # 2026-04-26
        topic = "-".join(parts[3:-1])                     # best-ai-tools

        long_audio  = AUDIO_DIR  / f"{date}-{topic}-long.mp3"
        short_timing = AUDIO_DIR / f"{date}-{topic}-short-timing.json"
        long_timing  = AUDIO_DIR / f"{date}-{topic}-long-timing.json"

        # Pexels search keywords — from script JSON if available, else topic slug
        keywords = topic.replace("-", " ")
        script_file = SCRIPTS_DIR / f"{date}-{topic}.json"
        if script_file.exists():
            with open(script_file) as f:
                script = json.load(f)
            keywords = script.get("keywords", keywords)

        print(f"── {topic}  ({date})  keywords: '{keywords}'")

        # Short script → vertical (YouTube Shorts / TikTok)
        if args.orientation in ("vertical", "both") and short_timing.exists():
            try:
                out = assemble(topic, date, short_audio, short_timing,
                               keywords, "vertical", keep_temp=args.keep_temp)
                results.append(out)
            except Exception as e:
                print(f"[assembler] ERROR (vertical): {e}")

        # Long script → horizontal (standard YouTube)
        if args.orientation in ("horizontal", "both") and long_audio.exists() and long_timing.exists():
            try:
                out = assemble(topic, date, long_audio, long_timing,
                               keywords, "horizontal", keep_temp=args.keep_temp)
                results.append(out)
            except Exception as e:
                print(f"[assembler] ERROR (horizontal): {e}")

    # Clean up shared temp directory
    if not args.keep_temp and TEMP_DIR.exists():
        shutil.rmtree(TEMP_DIR, ignore_errors=True)

    if results:
        print(f"\n[assembler] ✅  {len(results)} video(s) assembled:")
        for p in results:
            mb = p.stat().st_size / 1_048_576 if p.exists() else 0
            print(f"  {p.name}  ({mb:.1f} MB)")
    else:
        print("[assembler] No videos assembled.")
        sys.exit(1)


if __name__ == "__main__":
    main()
