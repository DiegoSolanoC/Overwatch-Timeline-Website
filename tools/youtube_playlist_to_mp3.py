#!/usr/bin/env python3
"""
Download a YouTube playlist and convert each video to MP3 (local conversion).

Setup (once):
  python -m pip install -r requirements-playlist.txt
  Install FFmpeg and ensure it is on your PATH (yt-dlp uses it for MP3).
  Windows example:  winget install Gyan.FFmpeg

Usage:
  python youtube_playlist_to_mp3.py "https://www.youtube.com/playlist?list=..."
  python youtube_playlist_to_mp3.py "URL" "D:\\Music\\OutFolder"

Only use for content you are allowed to download.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="YouTube playlist → MP3 (download + FFmpeg extract via yt-dlp)."
    )
    parser.add_argument("playlist_url", help="Full playlist URL (youtube.com/playlist?list=...)")
    parser.add_argument(
        "output_dir",
        nargs="?",
        default=str(Path(__file__).resolve().parent / "playlist-mp3-out"),
        help="Folder for MP3 files (default: tools/playlist-mp3-out)",
    )
    parser.add_argument(
        "--audio-quality",
        default="192",
        help="MP3 bitrate in kbps (default: 192)",
    )
    args = parser.parse_args()

    out = Path(args.output_dir).expanduser().resolve()
    out.mkdir(parents=True, exist_ok=True)

    try:
        import yt_dlp
    except ImportError:
        print("Missing yt-dlp. Run: python -m pip install -r requirements-playlist.txt", file=sys.stderr)
        return 1

    out_template = str(out / "%(playlist_index)03d - %(title)s.%(ext)s")

    ydl_opts: dict = {
        "quiet": False,
        "no_warnings": False,
        "noplaylist": False,
        "yes_playlist": True,
        "restrict_filenames": True,
        "no_overwrites": True,
        "format": "bestaudio/best",
        "outtmpl": out_template,
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": args.audio_quality,
            }
        ],
        "postprocessor_args": {
            "ffmpeg": ["-vn"],
        },
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([args.playlist_url])

    print(f"Done. MP3s in: {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
