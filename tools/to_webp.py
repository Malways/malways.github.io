# -*- coding: utf-8 -*-
"""Convert the raster screenshots under assets/img/ to WebP.

Stills go to lossy WebP; GIFs become animated WebP.  Every output is
re-opened and verified before the original is removed, and HTML
references are rewritten to match.

    python tools/to_webp.py            # convert, keep originals
    python tools/to_webp.py --replace  # convert, rewrite HTML, delete originals
"""
import io
import os
import re
import sys

from PIL import Image, ImageSequence

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(ROOT, "assets", "img")
HTML = ["index.html", "claude/index.html", "404.html"]

STILL_QUALITY = 82
ANIM_QUALITY = 68


def human(n):
    for unit in ("B", "KB", "MB"):
        if n < 1024 or unit == "MB":
            return "%.1f%s" % (n, unit)
        n /= 1024.0


def convert_still(src, dst):
    im = Image.open(src)
    if im.mode in ("P", "LA"):
        im = im.convert("RGBA")
    has_alpha = im.mode in ("RGBA", "LA") and im.getchannel("A").getextrema()[0] < 255
    if not has_alpha and im.mode != "RGB":
        im = im.convert("RGB")
    im.save(dst, "WEBP", quality=STILL_QUALITY, method=6)


def convert_animation(src, dst):
    im = Image.open(src)
    frames, durations = [], []
    for frame in ImageSequence.Iterator(im):
        frames.append(frame.convert("RGBA"))
        durations.append(frame.info.get("duration", 80))
    frames[0].save(
        dst, "WEBP",
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        quality=ANIM_QUALITY,
        method=4,
    )
    return len(frames)


def verify(path, expect_frames=None):
    """Re-open the output so a corrupt file never replaces a good original."""
    with Image.open(path) as im:
        im.load()
        if expect_frames is None:
            return None
        n = getattr(im, "n_frames", 1)
        if n < 2:
            raise ValueError("animation collapsed to a single frame")
        # The encoder merges identical consecutive frames; that keeps the
        # timing intact, so only report the difference.
        return n


def main():
    replace = "--replace" in sys.argv
    targets = []
    for dirpath, _dirs, files in os.walk(IMG_DIR):
        for name in sorted(files):
            if name.lower().endswith((".png", ".jpg", ".jpeg", ".gif")):
                targets.append(os.path.join(dirpath, name))

    if not targets:
        print("nothing to convert")
        return

    before = after = 0
    converted = []
    claimed = {}          # dst -> src that owns it, so names cannot collide

    for src in targets:
        stem, ext = os.path.splitext(src)
        dst = stem + ".webp"
        if dst in claimed or (os.path.exists(dst) and dst not in claimed):
            # Another source already owns this name (numero.png vs numero.gif).
            dst = stem + "-" + ext.lstrip(".").lower() + ".webp"
        claimed[dst] = src
        rel = os.path.relpath(src, ROOT).replace("\\", "/")
        src_size = os.path.getsize(src)

        try:
            if src.lower().endswith(".gif"):
                n = convert_animation(src, dst)
                out_frames = verify(dst, expect_frames=n)
                kind = "%d frames" % out_frames
                if out_frames != n:
                    kind += " (from %d, duplicates merged)" % n
            else:
                convert_still(src, dst)
                verify(dst)
                kind = "still"
        except Exception as exc:                      # noqa: BLE001
            print("  SKIP %-44s %s" % (rel, exc))
            if os.path.exists(dst):
                os.remove(dst)
            continue

        dst_size = os.path.getsize(dst)
        if dst_size >= src_size:
            # WebP is not always a win on small, few-colour GIFs.
            os.remove(dst)          # safe: this path is unique to this source
            print("  KEEP %-44s %8s  (WebP was larger)" % (rel, human(src_size)))
            before += src_size
            after += src_size
            continue

        before += src_size
        after += dst_size
        converted.append((src, dst))
        print("  %-44s %8s -> %8s  (%s, -%.0f%%)" % (
            rel, human(src_size), human(dst_size), kind,
            100 * (1 - dst_size / float(src_size))))

    print("\n  total %s -> %s  (-%.0f%%)" % (
        human(before), human(after), 100 * (1 - after / float(before))))

    if not replace:
        print("\n  dry run: originals kept, HTML untouched. Re-run with --replace.")
        return

    renames = {
        os.path.relpath(src, ROOT).replace("\\", "/"):
        os.path.relpath(dst, ROOT).replace("\\", "/")
        for src, dst in converted
    }

    for page in HTML:
        path = os.path.join(ROOT, page)
        s = io.open(path, encoding="utf-8").read()
        original = s
        for old, new in renames.items():
            # Reference may be root-relative, page-relative, or ../-prefixed.
            for prefix in ("", "../", "/"):
                s = s.replace(prefix + old, prefix + new)
        if s != original:
            io.open(path, "w", encoding="utf-8", newline="\n").write(s)
            print("  rewrote %s" % page)

    for src, _dst in converted:
        os.remove(src)
    print("  removed %d originals" % len(converted))


if __name__ == "__main__":
    main()
