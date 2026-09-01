#!/usr/bin/env python3
"""Guards the generated artifact.

`app_record.html` is a build product that is nevertheless committed, so these tests
pin it: it must be exactly what `apply_record_feature.py single` produces from
`app_clean.html` + `record_feature.patch.json` + `jszip.min.js`. That lock is what
lets the payload refactor be proven a no-op, and what makes a stale artifact loud
instead of silent.

`app_clean.html` and `jszip.min.js` are not in the repo (upstream/vendored). Tests
that need them skip with an explicit message rather than failing.
"""
import contextlib
import hashlib
import importlib.util
import io
import os
import shutil
import tempfile
import unittest

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# sha256 of the committed app_record.html, reproduced from the current build inputs.
BASELINE_SHA256 = "be2dd78b0893d00965b3b036f7d0ab930e52884b168f93d591ba0eb7469a73b1"

ARTIFACT = os.path.join(REPO, "app_record.html")
PATCH_JSON = os.path.join(REPO, "record_feature.patch.json")
CLEAN = os.path.join(REPO, "app_clean.html")
JSZIP = os.path.join(REPO, "jszip.min.js")
FAVICON = os.path.join(REPO, "favicon.ico")

BUILD_INPUTS = (CLEAN, JSZIP, FAVICON)
MISSING = [os.path.basename(p) for p in BUILD_INPUTS if not os.path.exists(p)]
NEED_INPUTS = "needs build inputs not kept in the repo: %s" % ", ".join(MISSING)


def _load_applier():
    spec = importlib.util.spec_from_file_location(
        "apply_record_feature", os.path.join(REPO, "apply_record_feature.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


APPLIER = _load_applier()


def op_payload(op):
    """Payload of an op, whichever form record_feature.patch.json uses.

    Mirrors the applier so these tests keep working across the payload refactor.
    """
    if hasattr(APPLIER, "op_payload"):
        return APPLIER.op_payload(op, REPO)
    return op["payload"]


def read(path, mode="r"):
    kw = {"encoding": "utf-8", "newline": ""} if mode == "r" else {}
    with open(path, mode, **kw) as f:
        return f.read()


def strip_js(text):
    """Blank out comments and string bodies so bracket counting sees only code."""
    out = []
    i, n = 0, len(text)
    while i < n:
        c = text[i]
        nxt = text[i + 1] if i + 1 < n else ""
        if c == "/" and nxt == "/":
            while i < n and text[i] != "\n":
                i += 1
        elif c == "/" and nxt == "*":
            i += 2
            while i < n and not (text[i] == "*" and i + 1 < n and text[i + 1] == "/"):
                i += 1
            i += 2
        elif c in "'\"`":
            quote, i = c, i + 1
            while i < n and text[i] != quote:
                i += 2 if text[i] == "\\" else 1
            i += 1
        else:
            out.append(c)
            i += 1
    return "".join(out)


class TestArtifact(unittest.TestCase):
    def test_baseline_hash(self):
        """The committed artifact is the one these tests were written against."""
        got = hashlib.sha256(read(ARTIFACT, "rb")).hexdigest()
        self.assertEqual(got, BASELINE_SHA256,
                         "app_record.html changed without the baseline hash being updated")

    @unittest.skipIf(MISSING, NEED_INPUTS)
    def test_regeneration_is_byte_identical(self):
        """Rebuilding from the inputs reproduces the committed artifact exactly."""
        tmp = tempfile.mkdtemp(prefix="srbuild-")
        try:
            for p in (CLEAN, JSZIP, FAVICON, PATCH_JSON):
                shutil.copy2(p, tmp)
            patch_dir = os.path.join(REPO, "patch")
            if os.path.isdir(patch_dir):
                shutil.copytree(patch_dir, os.path.join(tmp, "patch"))
            with contextlib.redirect_stdout(io.StringIO()):
                APPLIER.process_single(tmp, APPLIER.load_patch(tmp), add_icon=True)
            self.assertEqual(read(os.path.join(tmp, "app_record.html"), "rb"),
                             read(ARTIFACT, "rb"),
                             "regenerated app_record.html differs from the committed one")
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    @unittest.skipIf(MISSING, NEED_INPUTS)
    def test_reapply_aborts(self):
        """The idempotency guard refuses to patch an already-patched input."""
        tmp = tempfile.mkdtemp(prefix="srbuild-")
        try:
            for p in (JSZIP, FAVICON, PATCH_JSON):
                shutil.copy2(p, tmp)
            shutil.copy2(ARTIFACT, os.path.join(tmp, "app_clean.html"))
            with contextlib.redirect_stdout(io.StringIO()), self.assertRaises(SystemExit):
                APPLIER.process_single(tmp, APPLIER.load_patch(tmp), add_icon=True)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


class TestPatchOps(unittest.TestCase):
    def setUp(self):
        self.patch = APPLIER.load_patch(REPO)
        self.ops = self.patch["js_ops"]

    @unittest.skipIf(MISSING, NEED_INPUTS)
    def test_anchors_occur_exactly_once(self):
        """Every anchor is unambiguous in the pristine input."""
        clean = read(CLEAN)
        for op in self.ops:
            self.assertEqual(clean.count(op["anchor"]), 1,
                             "anchor for %r is not unique in app_clean.html" % op["name"])

    def test_payload_immediately_follows_anchor(self):
        """Each payload lands exactly once, directly after its anchor."""
        art = read(ARTIFACT)
        for op in self.ops:
            payload = op_payload(op)
            self.assertEqual(art.count(payload), 1,
                             "payload for %r does not appear exactly once" % op["name"])
            self.assertIn(op["anchor"] + payload, art,
                          "payload for %r is not directly after its anchor" % op["name"])

    def test_payload_brackets_balance(self):
        """Brackets balance across all payloads.

        test_js_functions.py parses the payloads properly wherever a JS engine is
        available; this is the fallback that still runs when none is. A syntax error
        blanks the whole app rather than failing loudly, so it is worth two checks.
        """
        code = strip_js("\n".join(op_payload(op) for op in self.ops))
        for opener, closer in (("{", "}"), ("(", ")"), ("[", "]")):
            depth = 0
            for ch in code:
                if ch == opener:
                    depth += 1
                elif ch == closer:
                    depth -= 1
                    self.assertGreaterEqual(depth, 0, "unbalanced %s%s in payloads" % (opener, closer))
            self.assertEqual(depth, 0, "unbalanced %s%s in payloads" % (opener, closer))

    def test_payload_files_are_well_formed(self):
        """Once payloads live in patch/*.js: LF-only, each referenced exactly once, no orphans."""
        patch_dir = os.path.join(REPO, "patch")
        if not os.path.isdir(patch_dir):
            self.skipTest("payloads are still inline in record_feature.patch.json")
        referenced = []
        for op in self.ops:
            self.assertIn("payload_file", op, "op %r has no payload_file" % op["name"])
            rel = op["payload_file"]
            path = os.path.join(REPO, rel)
            self.assertTrue(os.path.exists(path), "missing payload file %s" % rel)
            self.assertNotIn("\r", read(path), "%s must be LF-only" % rel)
            referenced.append(os.path.abspath(path))
        self.assertEqual(len(referenced), len(set(referenced)), "a payload file is referenced twice")
        on_disk = {os.path.abspath(os.path.join(patch_dir, n))
                   for n in os.listdir(patch_dir) if n.endswith(".js")}
        self.assertEqual(on_disk - set(referenced), set(), "orphan files in patch/")


if __name__ == "__main__":
    unittest.main()
