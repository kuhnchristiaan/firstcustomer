"""Verify actual Chromium PDF exports. Requires PyMuPDF (QA tooling only)."""
import json
import os
import sys
from pathlib import Path
if os.environ.get("PDF_QA_MODULE_PATH"):
    sys.path.insert(0, os.environ["PDF_QA_MODULE_PATH"])
import pymupdf as fitz
root = Path("artifacts/ui")
results = []
for name in ["refined-A4", "refined-Letter", "initial-A4", "short-A4", "long-A4", "refined-mobile-viewport-A4", "attributed-A4"]:
    doc = fitz.open(root / (name + ".pdf"))
    expected = (612, 792) if "Letter" in name else (595, 842)
    for i, page in enumerate(doc):
        assert (round(page.rect.width), round(page.rect.height)) == expected, (name, i, "paper size")
        words = [w for w in page.get_text("words") if w[4].replace("\ufffd", "").strip() and not (w[4] == "\u00b7" and w[1] < 0)]
        assert len(words) >= 10, (name, i, "blank or near-empty page")
        assert all(w[0] >= 0 and w[1] >= 0 and w[2] <= page.rect.width + 1 and w[3] <= page.rect.height + 1 for w in words), (name, i, "text outside page")
    results.append({"file":name+".pdf", "pages":len(doc), "paperPoints":expected})
assert (root / "refined-A4.pdf").read_bytes()  # Width is independent of screen viewport.
a = fitz.open(root / "refined-A4.pdf")
b = fitz.open(root / "refined-mobile-viewport-A4.pdf")
assert len(a) == len(b)
assert [p.get_text() for p in a] == [p.get_text() for p in b]
(root / "pdf-verification.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
print(json.dumps({"verified":len(results), "results":results}))
