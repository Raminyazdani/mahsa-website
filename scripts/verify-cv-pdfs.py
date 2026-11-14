"""Verify actual PDFs against derived WebsiteContent facts; no two-page ceiling.

Requires pypdf + pdfplumber. These checks complement all-page visual review and
do not claim to test the browser print dialog or the reader's perception.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from pathlib import Path

import pdfplumber
from pypdf import PdfReader
from PIL import Image, ImageChops, ImageStat


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFKC", value).replace("\u00ad", "").replace("\u200b", "")
    # A line wrap after a real hyphen retains that hyphen (SDS-\nPAGE).
    value = re.sub(r"(?<=-)\s*[\r\n]+\s*", "", value)
    return re.sub(r"\s+", " ", value).strip().casefold()


def luminance(color) -> float | None:
    if color is None:
        return None
    if isinstance(color, (int, float)):
        rgb = [float(color)] * 3
    else:
        values = list(color)
        if len(values) == 1:
            rgb = values * 3
        elif len(values) == 3:
            rgb = values
        elif len(values) == 4:
            c, m, y, k = values
            rgb = [(1 - c) * (1 - k), (1 - m) * (1 - k), (1 - y) * (1 - k)]
        else:
            return None
    linear = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in rgb]
    return sum(channel * weight for channel, weight in zip(linear, [0.2126, 0.7152, 0.0722]))


def verify(path: Path, expected: dict) -> dict:
    reader = PdfReader(path)
    if not reader.pages:
        raise AssertionError(f"{path}: empty PDF")
    text = normalize("\n".join(page.extract_text() or "" for page in reader.pages))
    missing = [fact for fact in expected["text"] if not any(normalize(item) in text for item in fact["alternatives"])]
    links = []
    for page in reader.pages:
        for annotation in page.get("/Annots", []):
            action = annotation.get_object().get("/A", {})
            if action.get("/URI"):
                links.append(str(action["/URI"]))
    missing_links = [item for item in expected["links"] if item["href"] not in links]
    image_checks = []
    resource_images = [image.image.convert("RGB") for page in reader.pages for image in page.images]
    for item in expected["images"]:
        if not item["src"].startswith("/"):
            continue
        public = Path(__file__).resolve().parent.parent / "public"
        source = (public / item["src"].lstrip("/")).resolve()
        if not source.is_relative_to(public.resolve()):
            raise AssertionError(f"Unexpected image path: {item['src']}")
        with Image.open(source) as original:
            original = original.convert("RGB")
            matches = [max(ImageStat.Stat(ImageChops.difference(image, original)).rms) for image in resource_images if image.size == original.size]
            best = min(matches) if matches else None
            # Tolerates small JPEG/ICC decoding differences, not changed artwork.
            image_checks.append({"path": item["path"], "size": list(original.size), "bestChannelRmsDifference": best, "matchesSourcePortrait": best is not None and best <= 3})
    outside, light_text, page_sizes = [], [], []
    image_count, characters, maximum_luminance = 0, 0, 0.0
    per_page_characters = []
    with pdfplumber.open(path) as pdf:
        for number, page in enumerate(pdf.pages, 1):
            page_characters = 0
            page_sizes.append([float(page.width), float(page.height)])
            image_count += len(page.images)
            # A4, tolerating renderer point rounding; page count is unrestricted.
            if abs(float(page.width) - 595.276) > 2 or abs(float(page.height) - 841.890) > 2:
                raise AssertionError(f"{path}, page {number}: expected A4; found {page.width} x {page.height}")
            for character in page.chars:
                if not character.get("text", "").strip():
                    continue
                characters += 1
                page_characters += 1
                if character["x0"] < -0.5 or character["top"] < -0.5 or character["x1"] > page.width + 0.5 or character["bottom"] > page.height + 0.5:
                    outside.append({"page": number, "text": character["text"], "bbox": [character["x0"], character["top"], character["x1"], character["bottom"]]})
                value = luminance(character.get("non_stroking_color"))
                if value is not None:
                    maximum_luminance = max(maximum_luminance, value)
                    if value > 0.5:
                        light_text.append({"page": number, "text": character["text"], "luminance": value})
            per_page_characters.append(page_characters)
    assert characters == sum(per_page_characters)
    failures = {"missingTextFacts": missing, "missingLinks": missing_links, "outsidePage": outside, "lightText": light_text}
    if image_count < len(expected["images"]):
        failures["missingImages"] = [{"expected": len(expected["images"]), "found": image_count}]
    if any(not item["matchesSourcePortrait"] for item in image_checks):
        failures["sourceImageMismatch"] = image_checks
    if any(failures.values()):
        raise AssertionError(json.dumps({"pdf": str(path), **failures}, ensure_ascii=False, indent=2))
    return {"pdf": str(path.resolve()), "locale": expected["locale"], "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "modelSha256": expected["modelSha256"], "fingerprint": expected.get("fingerprint"), "pages": len(reader.pages), "pageSizesPt": page_sizes, "verifiedTextFacts": len(expected["text"]), "verifiedLinkTargets": len(expected["links"]), "imageObjects": image_count, "sourceImageChecks": image_checks, "charactersWithinPage": characters, "charactersPerPage": per_page_characters, "maximumTextRelativeLuminance": maximum_luminance, "result": "pass", "limits": "Geometry/text/annotation checks supplement visual inspection; no browser print-dialog test claimed."}


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser()
    parser.add_argument("--expectations", type=Path, default=root / "output/cv-verification/expectations.json")
    parser.add_argument("--en", type=Path, default=root / "output/pdf/Mahsa-Nejadhossein-CV-en.pdf")
    parser.add_argument("--de", type=Path, default=root / "output/pdf/Mahsa-Nejadhossein-CV-de.pdf")
    parser.add_argument("--report", type=Path, default=root / "docs/evidence/pdf/verification.json")
    args = parser.parse_args()
    data = json.loads(args.expectations.read_text(encoding="utf-8-sig"))
    reports = [verify(getattr(args, expected["locale"]), expected) for expected in data["models"]]
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps({"checks": reports}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for report in reports:
        print(f"{report['locale']}: {report['pages']} A4 pages, {report['verifiedTextFacts']} model facts, {report['verifiedLinkTargets']} link targets, {report['imageObjects']} image object(s): PASS")


if __name__ == "__main__":
    main()
