#!/usr/bin/env python3
"""
apply_record_feature.py — apply the RECORD/SAVE (.sr export) feature patch.

The feature can be applied to EITHER:
  * the single self-contained file  app_clean.html          (mode: single)
  * the extracted pair              app_clean_extracted.js
                                    app_clean_extracted.html (mode: extracted)

The changes are read from record_feature.patch.json (byte-exact insertions).
JSZip is bundled from the vendored jszip.min.js: inlined for `single`,
referenced via <script src="jszip.min.js"> for `extracted`.

A favicon link (<link rel="icon" href="favicon.ico">) is added right after <head>
by default; pass -n/--noicon to skip it.

Every file is copied to "<file>.bak" before it is modified.

Usage:
    python3 apply_record_feature.py single
    python3 apply_record_feature.py extracted
    python3 apply_record_feature.py single --dir /path/to/project
    python3 apply_record_feature.py single --noicon
"""
import argparse
import json
import os
import re
import shutil
import sys


def load_patch(doc_dir):
    with open(os.path.join(doc_dir, "record_feature.patch.json"), encoding="utf-8") as f:
        return json.load(f)


def backup(path):
    bak = path + ".bak"
    shutil.copy2(path, bak)
    print(f"  backup: {os.path.basename(path)} -> {os.path.basename(bak)}")


def apply_js_ops(text, js_ops):
    """Insert each payload immediately after its (unique) anchor."""
    for op in js_ops:
        anchor, payload = op["anchor"], op["payload"]
        n = text.count(anchor)
        if n != 1:
            raise SystemExit(f"ERROR: JS anchor for '{op['name']}' found {n} times (expected 1). Aborting.")
        text = text.replace(anchor, anchor + payload, 1)
        print(f"  js: applied '{op['name']}'")
    return text


def apply_record_button(html, patch):
    """Insert the RECORD button right after the START (#button-power) button,
    matching the indentation of the existing button (works for both HTML files)."""
    m = re.search(r'([ \t]*)<button\b[^>]*id="%s"[^>]*>.*?</button>' % re.escape(patch["button_anchor_id"]),
                  html, re.DOTALL)
    if not m:
        raise SystemExit("ERROR: could not locate the START (#button-power) button. Aborting.")
    pre = m.group(1)
    rec = "\n".join(pre + ln for ln in patch["record_button_lines"])
    html = html[:m.end()] + "\n" + rec + html[m.end():]
    print("  html: inserted RECORD button")
    return html


def inline_jszip(html, doc_dir, patch):
    """single mode: inline jszip.min.js just before the app's inline <script>."""
    jz = patch["jszip"]
    lib = open(os.path.join(doc_dir, jz["vendor_file"]), encoding="utf-8").read().rstrip("\n")
    marker = "  </style>\n  <script>"
    if html.count(marker) != 1:
        raise SystemExit("ERROR: could not locate the '</style> + <script>' insertion point. Aborting.")
    block = ("  </style>\n"
             "  " + jz["comment"] + "\n"
             '  <script id="' + jz["script_id"] + '">\n'
             + lib + "\n"
             "  </script>\n"
             "  <script>")
    html = html.replace(marker, block, 1)
    print(f"  html: inlined {jz['vendor_file']} ({len(lib)} bytes)")
    return html


def reference_jszip(html, patch):
    """extracted mode: add <script src="jszip.min.js"> before the app's <script src=...>."""
    jz = patch["jszip"]
    m = re.search(r'([ \t]*)<script\s+src="app_clean_extracted\.js"></script>', html)
    if not m:
        raise SystemExit("ERROR: could not locate <script src=\"app_clean_extracted.js\">. Aborting.")
    pre = m.group(1)
    html = html[:m.start()] + pre + jz["src_ref"] + "\n" + html[m.start():]
    print(f"  html: referenced {jz['vendor_file']}")
    return html


def add_favicon(html, patch):
    """Insert the favicon <link> as the first child of <head>, matching the
    indentation of the existing first head child (works for both HTML files)."""
    fav = patch["favicon"]
    if fav["marker"] in html:
        print("  html: favicon link already present, skipping")
        return html
    m = re.search(r'<head>[^\n]*\n', html)
    if not m:
        raise SystemExit("ERROR: <head> not found; cannot add favicon. Aborting.")
    indent = re.match(r'[ \t]*', html[m.end():]).group(0)  # indent of the first head child
    html = html[:m.end()] + indent + fav["link"] + "\n" + html[m.end():]
    print(f"  html: added favicon link ({fav['file']})")
    return html


def process_single(doc_dir, patch, add_icon=True):
    path = os.path.join(doc_dir, "app_clean.html")
    if not os.path.exists(path):
        raise SystemExit(f"ERROR: {path} not found.")
    html = open(path, encoding="utf-8").read()
    if patch["js_marker"] in html or patch["record_marker"] in html:
        raise SystemExit("ERROR: app_clean.html already contains the RECORD feature. Aborting (nothing changed).")
    print("Patching app_clean.html (single, self-contained):")
    backup(path)
    html = apply_js_ops(html, patch["js_ops"])
    html = apply_record_button(html, patch)
    html = inline_jszip(html, doc_dir, patch)
    if add_icon:
        html = add_favicon(html, patch)
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"  wrote: {path}")


def process_extracted(doc_dir, patch, add_icon=True):
    js_path = os.path.join(doc_dir, "app_clean_extracted.js")
    html_path = os.path.join(doc_dir, "app_clean_extracted.html")
    for p in (js_path, html_path):
        if not os.path.exists(p):
            raise SystemExit(f"ERROR: {p} not found.")
    js = open(js_path, encoding="utf-8").read()
    html = open(html_path, encoding="utf-8").read()
    if patch["js_marker"] in js or patch["record_marker"] in html:
        raise SystemExit("ERROR: extracted parts already contain the RECORD feature. Aborting (nothing changed).")

    print("Patching app_clean_extracted.js:")
    backup(js_path)
    js = apply_js_ops(js, patch["js_ops"])
    with open(js_path, "w", encoding="utf-8") as f:
        f.write(js)
    print(f"  wrote: {js_path}")

    print("Patching app_clean_extracted.html:")
    backup(html_path)
    html = apply_record_button(html, patch)
    html = reference_jszip(html, patch)
    if add_icon:
        html = add_favicon(html, patch)
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"  wrote: {html_path}")
    print("Note: keep jszip.min.js" + (" and favicon.ico" if add_icon else "") +
          " next to app_clean_extracted.html so the referenced file(s) resolve.")


def main():
    ap = argparse.ArgumentParser(description="Apply the RECORD/SAVE .sr-export feature patch.")
    ap.add_argument("mode", choices=["single", "extracted"],
                    help="single = patch app_clean.html; extracted = patch app_clean_extracted.js/.html")
    ap.add_argument("--dir", default=os.path.dirname(os.path.abspath(__file__)),
                    help="project directory containing the target files (default: this script's directory)")
    ap.add_argument("-n", "--noicon", action="store_true",
                    help="do not add the favicon <link> to the HTML header")
    args = ap.parse_args()

    patch = load_patch(args.dir)
    add_icon = not args.noicon
    if args.mode == "single":
        process_single(args.dir, patch, add_icon=add_icon)
    else:
        process_extracted(args.dir, patch, add_icon=add_icon)
    print("Done.")


if __name__ == "__main__":
    main()
