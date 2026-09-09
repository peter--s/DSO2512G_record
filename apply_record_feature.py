#!/usr/bin/env python3
"""
apply_record_feature.py — build the RECORD/SAVE (.sr export) feature version.

The pristine inputs are never modified; new output files are written:
  * mode single    : app_clean.html            -> app_record.html
  * mode extracted : app_clean_extracted.js    -> app_record_extracted.js
                     app_clean_extracted.html  -> app_record_extracted.html

The changes are read from record_feature.patch.json (byte-exact insertions).
JSZip is bundled from the vendored jszip.min.js: inlined for `single`,
referenced via <script src="jszip.min.js"> for `extracted`. In `extracted` the
output HTML is re-pointed to app_record_extracted.js.

A favicon link (<link rel="icon" href="favicon.ico">) is added right after <head>
by default; pass -n/--noicon to skip it.

If an output file already exists it is copied to "<file>.bak" before being overwritten.

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


def op_payload(op, doc_dir):
    """Return an op's payload, from the inline "payload" key or from "payload_file".

    Payloads are byte-exact insertions: they carry their own leading newlines and
    must not gain or lose any. A payload file is therefore read verbatim (newline=""
    disables CRLF translation) and exactly one trailing newline is stripped, which
    lets the files be well-formed text files while staying byte-exact. A CR anywhere
    is rejected rather than silently corrupting the output.
    """
    if ("payload" in op) == ("payload_file" in op):
        raise SystemExit(f"ERROR: op '{op['name']}' needs exactly one of "
                         f"'payload' / 'payload_file'. Aborting.")
    if "payload" in op:
        return op["payload"]
    path = os.path.join(doc_dir, op["payload_file"])
    if not os.path.exists(path):
        raise SystemExit(f"ERROR: payload file not found: {path}. Aborting.")
    with open(path, encoding="utf-8", newline="") as f:
        text = f.read()
    if "\r" in text:
        raise SystemExit(f"ERROR: {op['payload_file']} contains CR; payload files "
                         f"must be LF-only. Aborting.")
    return text[:-1] if text.endswith("\n") else text


def apply_js_ops(text, js_ops, doc_dir, label="js"):
    """Apply each op at its (unique) anchor.

    Default is insertion: the payload lands immediately after the anchor, which keeps the
    anchor itself in the output and makes the op a pure addition. An op marked
    "replace": true substitutes the payload *for* the anchor instead — needed for fixes that
    correct existing code rather than extend it. Either way the anchor must be unique, so a
    change in the app that moves or duplicates it fails loudly rather than landing twice.
    """
    for op in js_ops:
        anchor, payload = op["anchor"], op_payload(op, doc_dir)
        n = text.count(anchor)
        if n != 1:
            raise SystemExit(f"ERROR: {label} anchor for '{op['name']}' found {n} times (expected 1). Aborting.")
        replacing = op.get("replace", False)
        text = text.replace(anchor, payload if replacing else anchor + payload, 1)
        print(f"  {label}: {'replaced at' if replacing else 'applied'} '{op['name']}'")
    return text


def ops_for(ops, target):
    """The ops aimed at one document.

    In `single` mode the app is one file, so JS and HTML/CSS ops both apply to it. In
    `extracted` mode they are two files and each op has to go to the right one; an op says
    which with "target": "html", defaulting to "js".
    """
    return [op for op in ops if op.get("target", "js") == target]


def select_app_fix_ops(all_ops, spec):
    """Resolve --with-app-fixes into the ops to apply.

    App fixes correct defects in the app itself rather than adding the recorder, so they are
    opt-in and individually selectable: the default build stays byte-identical to the recorder
    alone. `spec` is None (none selected), "ALL" (bare flag), or a comma-separated list of
    1-based numbers and/or op names.
    """
    if spec is None:
        return []
    if spec == "ALL":
        return list(all_ops)
    by_name = {op["name"]: op for op in all_ops}
    chosen, seen = [], set()
    for token in (t.strip() for t in spec.split(",")):
        if not token:
            continue
        op = None
        if token.isdigit():
            i = int(token)
            if 1 <= i <= len(all_ops):
                op = all_ops[i - 1]
        else:
            op = by_name.get(token)
        if op is None:
            valid = ", ".join(f"{i}={o['name']}" for i, o in enumerate(all_ops, 1)) or "(none defined)"
            raise SystemExit(f"ERROR: unknown app fix '{token}'. Valid: {valid}. Aborting.")
        if op["name"] not in seen:
            seen.add(op["name"])
            chosen.append(op)
    return chosen


def describe_app_fixes(patch):
    """Numbered listing of the selectable app fixes, for --help."""
    ops = patch.get("app_fix_ops", [])
    if not ops:
        return ""
    lines = ["app fixes for --with-app-fixes (default: none applied):"]
    for i, op in enumerate(ops, 1):
        lines.append(f"  {i}. {op['name']:<14} {op.get('description', '')}")
    lines.append("")
    lines.append("  --with-app-fixes            apply all of them")
    lines.append("  --with-app-fixes=1,fw_version   apply only the listed ones (numbers or names)")
    return "\n".join(lines)


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
    with open(os.path.join(doc_dir, jz["vendor_file"]), encoding="utf-8") as f:
        lib = f.read().rstrip("\n")
    # The marker is the app's own opening <script> tag, which differs between app versions
    # (beta42's first script tag carries an id), so it lives in the patch file.
    marker = jz.get("marker", "  </style>\n  <script>")
    if html.count(marker) != 1:
        raise SystemExit(f"ERROR: the JSZip insertion marker {marker!r} occurs "
                         f"{html.count(marker)} times (expected 1). Aborting.")
    block = (marker.rstrip("\n").rsplit("<script>", 1)[0]
             + "  " + jz["comment"] + "\n"
             '  <script id="' + jz["script_id"] + '">\n'
             + lib + "\n"
             "  </script>\n"
             "  <script>" + ("\n" if marker.endswith("\n") else ""))
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


def add_favicon(html, patch, replace_existing=False):
    """Insert the favicon <link> as the first child of <head>, matching the
    indentation of the existing first head child (works for both HTML files).

    Newer app versions ship their own favicon (beta42 inlines one as a data URI), so by
    default an existing icon is left alone. --favicon replace swaps it for the patch's own.
    """
    fav = patch["favicon"]
    if fav["marker"] in html:
        if not replace_existing:
            print("  html: favicon link already present, skipping")
            return html
        m = re.search(r'[ \t]*<link\b[^>]*\brel="icon"[^>]*>[ \t]*\n?', html)
        if not m:
            raise SystemExit("ERROR: an icon is present but its <link> could not be located "
                             "to replace. Aborting.")
        html = html[:m.start()] + html[m.end():]
        print("  html: removed the app's own favicon link")
    m = re.search(r'<head>[^\n]*\n', html)
    if not m:
        raise SystemExit("ERROR: <head> not found; cannot add favicon. Aborting.")
    indent = re.match(r'[ \t]*', html[m.end():]).group(0)  # indent of the first head child
    html = html[:m.end()] + indent + fav["link"] + "\n" + html[m.end():]
    print(f"  html: added favicon link ({fav['file']})")
    return html


def write_output(path, text):
    """Write text to path, backing up an existing output to <path>.bak first."""
    if os.path.exists(path):
        backup(path)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"  wrote: {os.path.basename(path)}")


def process_single(doc_dir, patch, add_icon=True, app_fixes=(), replace_icon=False):
    in_path = os.path.join(doc_dir, "app_clean.html")
    out_path = os.path.join(doc_dir, "app_record.html")
    if not os.path.exists(in_path):
        raise SystemExit(f"ERROR: {in_path} not found.")
    with open(in_path, encoding="utf-8") as f:
        html = f.read()
    if patch["js_marker"] in html or patch["record_marker"] in html:
        raise SystemExit("ERROR: app_clean.html already contains the RECORD feature. Aborting (nothing changed).")
    print("Building app_record.html (single, self-contained) from app_clean.html:")
    # One document here, so JS and HTML ops both apply to it.
    html = apply_js_ops(html, patch["js_ops"], doc_dir)
    html = apply_js_ops(html, patch.get("html_ops", []), doc_dir, label="html")
    html = apply_js_ops(html, app_fixes, doc_dir, label="fix")
    if patch.get("button_anchor_id"):
        html = apply_record_button(html, patch)
    html = inline_jszip(html, doc_dir, patch)
    if add_icon:
        html = add_favicon(html, patch, replace_existing=replace_icon)
    write_output(out_path, html)
    print("  (input app_clean.html left unchanged)")


def process_extracted(doc_dir, patch, add_icon=True, app_fixes=(), replace_icon=False):
    in_js = os.path.join(doc_dir, "app_clean_extracted.js")
    in_html = os.path.join(doc_dir, "app_clean_extracted.html")
    out_js = os.path.join(doc_dir, "app_record_extracted.js")
    out_html = os.path.join(doc_dir, "app_record_extracted.html")
    for p in (in_js, in_html):
        if not os.path.exists(p):
            raise SystemExit(f"ERROR: {p} not found.")
    with open(in_js, encoding="utf-8") as f:
        js = f.read()
    with open(in_html, encoding="utf-8") as f:
        html = f.read()
    if patch["js_marker"] in js or patch["record_marker"] in html:
        raise SystemExit("ERROR: extracted parts already contain the RECORD feature. Aborting (nothing changed).")

    # Two documents here, so each op has to be routed to the one its anchor lives in.
    print("Building app_record_extracted.js from app_clean_extracted.js:")
    js = apply_js_ops(js, patch["js_ops"], doc_dir)
    js = apply_js_ops(js, ops_for(app_fixes, "js"), doc_dir, label="fix")
    write_output(out_js, js)

    print("Building app_record_extracted.html from app_clean_extracted.html:")
    html = apply_js_ops(html, patch.get("html_ops", []), doc_dir, label="html")
    html = apply_js_ops(html, ops_for(app_fixes, "html"), doc_dir, label="fix")
    if patch.get("button_anchor_id"):
        html = apply_record_button(html, patch)
    html = reference_jszip(html, patch)
    # Re-point the app <script src> from the input JS to the output JS.
    html = html.replace("app_clean_extracted.js", "app_record_extracted.js")
    if add_icon:
        html = add_favicon(html, patch, replace_existing=replace_icon)
    write_output(out_html, html)
    print("  (inputs left unchanged)")
    print("Note: keep jszip.min.js" + (" and favicon.ico" if add_icon else "") +
          " next to app_record_extracted.html so the referenced file(s) resolve.")


def main():
    default_dir = os.path.dirname(os.path.abspath(__file__))
    try:  # only to build the --help listing; a missing/broken patch file is reported later
        epilog = describe_app_fixes(load_patch(default_dir))
    except Exception:
        epilog = ""

    ap = argparse.ArgumentParser(
        description="Build the RECORD/SAVE .sr-export feature version (writes new files; inputs untouched).",
        epilog=epilog, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("mode", choices=["single", "extracted"],
                    help="single = app_clean.html -> app_record.html; "
                         "extracted = app_clean_extracted.{js,html} -> app_record_extracted.{js,html}")
    ap.add_argument("--dir", default=default_dir,
                    help="project directory containing the target files (default: this script's directory)")
    ap.add_argument("-n", "--noicon", action="store_true",
                    help="do not add the favicon <link> to the HTML header")
    ap.add_argument("--with-app-fixes", nargs="?", const="ALL", default=None, metavar="LIST",
                    help="also apply fixes to the app itself (see the list below); "
                         "bare = all, or a comma-separated list of numbers/names")
    ap.add_argument("--favicon", choices=["keep", "replace"], default="keep",
                    help="what to do when the app already ships its own icon: keep it "
                         "(default) or replace it with the patch's favicon")
    args = ap.parse_args()

    patch = load_patch(args.dir)
    add_icon = not args.noicon
    replace_icon = args.favicon == "replace"
    app_fixes = select_app_fix_ops(patch.get("app_fix_ops", []), args.with_app_fixes)
    if args.mode == "single":
        process_single(args.dir, patch, add_icon=add_icon, app_fixes=app_fixes,
                       replace_icon=replace_icon)
    else:
        process_extracted(args.dir, patch, add_icon=add_icon, app_fixes=app_fixes,
                          replace_icon=replace_icon)
    print("Done.")


if __name__ == "__main__":
    main()
