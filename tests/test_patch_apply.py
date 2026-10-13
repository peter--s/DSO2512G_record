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
BASELINE_SHA256 = "d4a7296fe486ba3a3040c4b961e5dbc6228b7bacee50e06de7a1abf617f1a554"

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
        # App fixes are opt-in and are NOT in the committed artifact, so they are checked for
        # well-formedness and anchor uniqueness but never for presence in app_record.html.
        self.fix_ops = self.patch.get("app_fix_ops", [])
        self.html_ops = self.patch.get("html_ops", [])

    @unittest.skipIf(MISSING, NEED_INPUTS)
    def test_anchors_occur_exactly_once(self):
        """Every anchor is unambiguous in the pristine input."""
        clean = read(CLEAN)
        for op in self.ops + self.html_ops + self.fix_ops:
            for edit in APPLIER.op_edits(op):
                self.assertEqual(clean.count(edit["anchor"]), 1,
                                 "anchor for %r is not unique in app_clean.html" % edit["name"])

    def test_payload_immediately_follows_anchor(self):
        """Each payload lands exactly once, directly after its anchor."""
        art = read(ARTIFACT)
        for op in self.ops:  # recorder ops only: app fixes are opt-in and not in the artifact
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
        code = strip_js("\n".join(op_payload(e) for op in self.ops for e in APPLIER.op_edits(op)))
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
        for op in self.ops + self.html_ops + self.fix_ops:
            for edit in APPLIER.op_edits(op):
                self.assertIn("payload_file", edit, "op %r has no payload_file" % edit["name"])
                rel = edit["payload_file"]
                path = os.path.join(REPO, rel)
                self.assertTrue(os.path.exists(path), "missing payload file %s" % rel)
                self.assertNotIn("\r", read(path), "%s must be LF-only" % rel)
                referenced.append(os.path.abspath(path))
        self.assertEqual(len(referenced), len(set(referenced)), "a payload file is referenced twice")
        on_disk = {os.path.abspath(os.path.join(patch_dir, n))
                   for n in os.listdir(patch_dir) if n.endswith(".js")}
        self.assertEqual(on_disk - set(referenced), set(), "orphan files in patch/")


class TestOpMechanics(unittest.TestCase):
    """insert vs replace, and routing ops to the right document.

    Exercised on a synthetic document so these hold regardless of which app version the
    repo currently targets, and without needing the (untracked) app inputs.
    """

    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="srops-")
        os.makedirs(os.path.join(self.tmp, "patch"))
        self.addCleanup(shutil.rmtree, self.tmp, True)

    def payload_file(self, name, text):
        rel = os.path.join("patch", name)
        with open(os.path.join(self.tmp, rel), "w", encoding="utf-8", newline="") as f:
            f.write(text)
        return rel

    def apply(self, text, ops):
        with contextlib.redirect_stdout(io.StringIO()):
            return APPLIER.apply_js_ops(text, ops, self.tmp)

    def test_insert_keeps_the_anchor(self):
        op = {"name": "ins", "anchor": "MARK", "payload_file": self.payload_file("ins.js", "ADDED\n")}
        self.assertEqual(self.apply("a MARK b", [op]), "a MARKADDED b")

    def test_replace_consumes_the_anchor(self):
        op = {"name": "rep", "anchor": "MARK", "replace": True,
              "payload_file": self.payload_file("rep.js", "NEW\n")}
        self.assertEqual(self.apply("a MARK b", [op]), "a NEW b")

    def test_replace_defaults_to_false(self):
        """An op without the key must keep behaving as a pure insertion."""
        op = {"name": "d", "anchor": "M", "payload_file": self.payload_file("d.js", "X\n")}
        self.assertEqual(self.apply("M", [op]), "MX")

    def test_missing_anchor_aborts(self):
        op = {"name": "gone", "anchor": "NOPE", "payload_file": self.payload_file("g.js", "X\n")}
        with self.assertRaises(SystemExit) as cm:
            self.apply("nothing here", [op])
        self.assertIn("found 0 times", str(cm.exception))

    def test_duplicate_anchor_aborts(self):
        """A duplicated anchor is ambiguous, so it must fail rather than patch one at random."""
        op = {"name": "dup", "anchor": "M", "payload_file": self.payload_file("dup.js", "X\n")}
        with self.assertRaises(SystemExit) as cm:
            self.apply("M and M", [op])
        self.assertIn("found 2 times", str(cm.exception))

    def test_ops_route_by_target(self):
        js = {"name": "a", "anchor": "x"}
        explicit = {"name": "b", "anchor": "y", "target": "js"}
        html = {"name": "c", "anchor": "z", "target": "html"}
        ops = [js, explicit, html]
        self.assertEqual([o["name"] for o in APPLIER.ops_for(ops, "js")], ["a", "b"])
        self.assertEqual([o["name"] for o in APPLIER.ops_for(ops, "html")], ["c"])


class TestFaviconPolicy(unittest.TestCase):
    """--favicon keep|replace, for apps that ship their own icon (beta42 inlines one)."""

    PATCH = {"favicon": {"file": "favicon.ico", "marker": 'rel="icon"',
                         "link": '<link rel="icon" href="favicon.ico"/>'}}

    def run_favicon(self, html, replace):
        with contextlib.redirect_stdout(io.StringIO()):
            return APPLIER.add_favicon(html, self.PATCH, replace_existing=replace)

    def test_adds_when_absent(self):
        out = self.run_favicon("<head>\n  <meta charset=\"utf-8\"/>\n</head>\n", False)
        self.assertIn('<link rel="icon" href="favicon.ico"/>', out)

    def test_keep_leaves_the_app_icon_alone(self):
        html = '<head>\n  <link rel="icon" href="data:image/png;base64,AAAA"/>\n</head>\n'
        self.assertEqual(self.run_favicon(html, False), html)

    def test_replace_swaps_the_app_icon(self):
        html = '<head>\n  <link rel="icon" href="data:image/png;base64,AAAA"/>\n</head>\n'
        out = self.run_favicon(html, True)
        self.assertNotIn("data:image/png", out)
        self.assertEqual(out.count('rel="icon"'), 1)
        self.assertIn('href="favicon.ico"', out)


class TestAppFixSelection(unittest.TestCase):
    """--with-app-fixes picks ops by number or name; the default build is unaffected."""

    def setUp(self):
        self.patch = APPLIER.load_patch(REPO)
        self.fix_ops = self.patch.get("app_fix_ops", [])
        self.html_ops = self.patch.get("html_ops", [])
        if not self.fix_ops:
            self.skipTest("no app_fix_ops defined")

    def names(self, spec):
        return [op["name"] for op in APPLIER.select_app_fix_ops(self.fix_ops, spec)]

    def test_default_selects_nothing(self):
        """Omitting the flag must leave the recorder-only build untouched."""
        self.assertEqual(self.names(None), [])

    def test_bare_flag_selects_all(self):
        self.assertEqual(self.names("ALL"), [op["name"] for op in self.fix_ops])

    def test_number_and_name_agree(self):
        first = self.fix_ops[0]["name"]
        self.assertEqual(self.names("1"), [first])
        self.assertEqual(self.names(first), [first])

    def test_duplicates_collapse_and_order_follows_the_list(self):
        first = self.fix_ops[0]["name"]
        self.assertEqual(self.names("1,%s,1" % first), [first])

    def test_unknown_token_aborts_with_the_valid_list(self):
        with self.assertRaises(SystemExit) as cm:
            self.names("no-such-fix")
        self.assertIn("no-such-fix", str(cm.exception))
        self.assertIn(self.fix_ops[0]["name"], str(cm.exception))

    def test_out_of_range_number_aborts(self):
        with self.assertRaises(SystemExit):
            self.names(str(len(self.fix_ops) + 1))

    @unittest.skipIf(MISSING, NEED_INPUTS)
    def test_each_fix_applies_on_its_own(self):
        """Any subset must be valid: the fixes are advertised as individually selectable."""
        clean = read(CLEAN)
        for i, op in enumerate(self.fix_ops, 1):
            ops = APPLIER.select_app_fix_ops(self.fix_ops, str(i))
            with contextlib.redirect_stdout(io.StringIO()):
                out = APPLIER.apply_js_ops(clean, ops, REPO, label="fix")
            self.assertNotEqual(out, clean, "fix %d (%s) changed nothing" % (i, op["name"]))

    @unittest.skipIf(MISSING, NEED_INPUTS)
    def test_multi_unit_buttons_land_on_their_own_menu_pages(self):
        """Each of the three edits must wire the unit toggler belonging to ITS menu page.

        The app declares 28 byte-identical `multiButtLeft = function() {};` stub pairs, one per
        menu page, so an anchor that is merely present is not enough: it has to be the pair
        inside the right `case`. Each anchor therefore carries the tail of that page's own
        multiCounterClockwise body. A mis-anchored edit would silently give, say, the Bode Plot
        menu the Channel 1 filter behaviour, which nothing else here would catch.
        """
        clean = read(CLEAN)
        ops = APPLIER.select_app_fix_ops(self.fix_ops, "multi_unit_buttons")
        self.assertEqual(len(ops), 1)
        with contextlib.redirect_stdout(io.StringIO()):
            out = APPLIER.apply_js_ops(clean, ops, REPO, label="fix")

        for sym, toggler in (("appParam_FFTImpedance", "toggleFFTImpedanceUnits"),
                             ("appParam_CH1_LPFValue", "toggleCH1BWLimitUnits"),
                             ("appParam_CH2_LPFValue", "toggleCH2BWLimitUnits")):
            self.assertEqual(out.count("multiButtRight = %s;" % toggler), 1,
                             "%s must be wired exactly once" % toggler)
            # The app's own menu-option button already calls each toggler, so count the DELTA
            # this patch introduces rather than the absolute number: forward twice is one step
            # back, so the reverse direction adds exactly two calls.
            call = "                %s();\n" % toggler
            self.assertEqual(out.count(call) - clean.count(call), 2,
                             "%s reverse step must add two calls" % toggler)

            # Each wired toggler must sit in the `case` that owns the matching variable. The edit
            # restates that page's own multiCounterClockwise tail, so the tail has to appear just
            # above the wiring with no intervening `case` label - which is what pins the edit to
            # the right menu page out of the 28 identical stub pairs.
            tail = "%s[3] = %s[0].toString()" % (sym, sym)
            gap = out[out.rindex(tail):out.index("multiButtRight = %s;" % toggler)]
            self.assertNotIn("case ", gap,
                             "%s was wired outside the case holding %s" % (toggler, sym))
            self.assertLess(len(gap), 1200,
                            "%s is too far from %s to be in the same case" % (toggler, sym))

        # And the stubs that were replaced are gone from exactly three places.
        stubs = ("            };\n            multiButtLeft = function() {};\n"
                 "            multiButtRight = function() {};")
        self.assertEqual(clean.count(stubs) - out.count(stubs), 3,
                         "exactly three stub pairs must have been replaced")

    @unittest.skipIf(MISSING, NEED_INPUTS)
    def test_fixed_build_differs_and_is_reproducible(self):
        """A build with fixes differs from the plain one, and both are deterministic."""
        def build(spec):
            tmp = tempfile.mkdtemp(prefix="srfix-")
            try:
                for p in (CLEAN, JSZIP, FAVICON, PATCH_JSON):
                    shutil.copy2(p, tmp)
                shutil.copytree(os.path.join(REPO, "patch"), os.path.join(tmp, "patch"))
                fixes = APPLIER.select_app_fix_ops(self.fix_ops, spec)
                with contextlib.redirect_stdout(io.StringIO()):
                    APPLIER.process_single(tmp, APPLIER.load_patch(tmp), add_icon=True, app_fixes=fixes)
                return read(os.path.join(tmp, "app_record.html"), "rb")
            finally:
                shutil.rmtree(tmp, ignore_errors=True)

        plain, fixed = build(None), build("ALL")
        self.assertNotEqual(plain, fixed, "--with-app-fixes did not change the output")
        self.assertEqual(plain, read(ARTIFACT, "rb"),
                         "the no-fixes build must still reproduce the committed artifact")
        self.assertEqual(fixed, build("ALL"), "the fixed build is not reproducible")


@unittest.skipIf(MISSING, NEED_INPUTS)
class TestCleanedInputTitle(unittest.TestCase):
    """app_clean.html must still carry the app's &nbsp;-padded title block.

    The title's horizontal layout depends entirely on non-breaking spaces: .title-text-2 is
    position: absolute, so "ZEEWEII" contributes no width to the line, and the only thing
    keeping "DSO2512G" clear of it is a run of six &nbsp; inside #title-text. BeautifulSoup's
    prettify() decodes &nbsp; to U+00A0, which Python's str.strip() treats as whitespace, so
    re-indenting deletes exactly those paddings and the two titles render on top of each other.
    prettify() also puts inline elements on their own lines, and a newline between inline
    elements renders as a space, so DSO<span>2512</span>G becomes a visibly spaced "DSO 2512 G".

    Both are repaired by `js_analyzer.py <file> --clean`, which is the documented build path.
    Cleaning with html_cleaner.py instead produces a file that patches and tests perfectly while
    being visibly wrong in the browser - which is how it happened - so the artifact is checked
    here rather than trusted.
    """

    CANON = ('<span class="title-text-2">&nbsp;ZEEWEII</span>'
             '<span id="title-text">&nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; '
             'DSO<span class="colored-text">2512</span>G')

    def test_the_title_block_is_intact(self):
        self.assertIn(self.CANON, read(CLEAN),
                      "app_clean.html lost the title's &nbsp; padding - re-clean it with "
                      "js_analyzer.py --clean, not html_cleaner.py")

    def test_the_patched_app_keeps_it(self):
        """The patch must not disturb it either."""
        self.assertIn(self.CANON, read(ARTIFACT))

    def test_the_title_keeps_its_full_padding(self):
        """All thirteen of the title block's own &nbsp;, not just the six that space the names.

        The app loses 22 further &nbsp; elsewhere to prettify, and that is deliberate: those sit
        between inline elements, where prettify leaves a newline that collapses to one ordinary
        space of the same width, so the only visible effect is three label gaps narrowing by
        about 3px. The title is the sole place where the padding is load-bearing, because it
        works against an absolutely positioned sibling and leading whitespace in an inline
        formatting context is dropped outright rather than collapsed.
        """
        clean = read(CLEAN)
        start = clean.index('<span class="title-text-2">&nbsp;ZEEWEII')
        end = clean.index("200 MSa/s</span>", start) + len("200 MSa/s</span>")
        self.assertEqual(clean[start:end].count("&nbsp;"), 13)


if __name__ == "__main__":
    unittest.main()
