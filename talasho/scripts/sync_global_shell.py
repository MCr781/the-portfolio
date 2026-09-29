#!/usr/bin/env python3
"""Generate the shared site header and footer in every standalone HTML page."""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
PARTIALS_DIR = ROOT / "assets" / "partials"
HEADER_PARTIAL = PARTIALS_DIR / "site-header.html"
FOOTER_PARTIAL = PARTIALS_DIR / "site-footer.html"

HEADER_START = "<!-- GLOBAL SITE HEADER: START -->"
HEADER_END = "<!-- GLOBAL SITE HEADER: END -->"
FOOTER_START = "<!-- GLOBAL SITE FOOTER: START -->"
FOOTER_END = "<!-- GLOBAL SITE FOOTER: END -->"
BOTTOM_NAV_START = "<!-- GLOBAL SITE BOTTOM NAV: START -->"
BOTTOM_NAV_END = "<!-- GLOBAL SITE BOTTOM NAV: END -->"
STOREFRONT_NAV_PARTIAL = PARTIALS_DIR / "site-bottom-nav.html"
WALLET_NAV_PARTIAL = PARTIALS_DIR / "site-bottom-nav-wallet.html"

# Pages that use the wallet app-style bottom nav (Home / Rates / Buy FAB / Account).
WALLET_HUB_PAGES = {
    "wallet/index.html",
    "wallet/rates.html",
    "wallet/transactions.html",
    "wallet/missions.html",
    "wallet/vaults.html",
    "wallet/invite.html",
}

# Task-flow pages that must NOT get the bottom nav: checkout flows, the offline
# splash and the wallet action screens keep their own full-screen bottom UI.
NO_BOTTOM_NAV_PAGES = {
    "cart.html",
    "checkout.html",
    "checkout-result.html",
    "pwa/offline.html",
    "wallet/login.html",
    "wallet/buy.html",
    "wallet/sell.html",
    "wallet/deposit.html",
    "wallet/withdraw.html",
    "wallet/payment-result.html",
    "wallet/setup-success.html",
    "wallet/bank-account.html",
    "wallet/physical.html",
    "wallet/receipt.html",
    # profile.html keeps its own unique 7-tab bottom bar (drives the profile
    # tab sections) instead of the shared wallet app nav — see the restored
    # "MOBILE BOTTOM TAB BAR" block in wallet/profile.html.
    "wallet/profile.html",
}
SHELL_SCRIPT_PATTERN = re.compile(
    r'<script\s+src="[^"]*assets/js/global-shell\.js(?:\?[^"]*)?"\s+defer></script>'
)

# Legacy hand-coded mobile navs that predate the shared partial. Removed on
# every sync so a page can never end up with two fixed bottom bars. The new
# partial navs carry a `bottom-nav` class and are excluded via lookahead.
LEGACY_NAV_BLOCK = re.compile(
    r"(?:<!--[^>]*?MOBILE BOTTOM NAV[^>]*?-->\s*)?"
    r'<nav\b(?![^>]*\bbottom-nav\b)[^>]*class="[^"]*\bfixed\b[^"]*\bbottom-0\b[^"]*"[^>]*>.*?</nav>',
    re.IGNORECASE | re.DOTALL,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check",
        action="store_true",
        help="Verify that every page matches the canonical shell without writing files.",
    )
    return parser.parse_args()


def find_tag_end(text: str, tag: str, start: int) -> int:
    pattern = re.compile(rf"</?{tag}\b[^>]*>", re.IGNORECASE)
    depth = 0
    for match in pattern.finditer(text, start):
        token = match.group(0)
        if token.startswith("</"):
            depth -= 1
            if depth == 0:
                return match.end()
        else:
            depth += 1
    raise ValueError(f"Unclosed <{tag}> starting near offset {start}")


def extract_index_shell(index_text: str) -> tuple[str, str, tuple[int, int]]:
    announcement_label = "1. ANNOUNCEMENT BAR (Vertical Slider)"
    label_pos = index_text.find(announcement_label)
    if label_pos < 0:
        raise ValueError("Cannot find the index announcement bar")

    header_start = index_text.rfind(
        "<!-- ========================================== -->", 0, label_pos
    )
    header_end_marker = "<!-- ================= SECTION: MAIN HEADER END ================= -->"
    header_end_pos = index_text.find(header_end_marker, label_pos)
    if header_start < 0 or header_end_pos < 0:
        raise ValueError("Cannot find the complete index header shell")
    header_end = header_end_pos + len(header_end_marker)

    footer_start = index_text.rfind("<footer")
    if footer_start < 0:
        raise ValueError("Cannot find the index footer")
    footer_end = find_tag_end(index_text, "footer", footer_start)

    return (
        index_text[header_start:header_end].strip(),
        index_text[footer_start:footer_end].strip(),
        (header_start, header_end),
    )


def canonicalize_header(header: str) -> str:
    replacements = {
        'href="/"': 'href="{{ROOT}}index.html"',
        'src="./assets/': 'src="{{ROOT}}assets/',
        'href="./assets/': 'href="{{ROOT}}assets/',
        "mobileMenuToggle": "globalMobileMenuToggle",
        "mobileMenuClose": "globalMobileMenuClose",
        "mobileMenuOverlay": "globalMobileMenuOverlay",
        "mobileMenu": "globalMobileMenu",
        "searchInputMobile": "globalSearchInputMobile",
        "searchInput": "globalSearchInput",
    }
    for old, new in replacements.items():
        header = header.replace(old, new)

    profile_pos = header.find("<!-- Profile / Login -->")
    if profile_pos >= 0:
        href_pos = header.find('href="#"', profile_pos)
        if href_pos >= 0:
            header = (
                header[:href_pos]
                + 'href="{{ROOT}}wallet/login.html"'
                + header[href_pos + len('href="#"') :]
            )

    mobile_login = (
        '<a href="#" class="flex items-center justify-center gap-2 w-full btn-primary">'
    )
    header = header.replace(
        mobile_login,
        '<a href="{{ROOT}}wallet/login.html" class="flex items-center justify-center gap-2 w-full btn-primary">',
        1,
    )
    return header


def canonicalize_footer(footer: str) -> str:
    return footer.replace('src="./assets/', 'src="{{ROOT}}assets/').replace(
        'href="./assets/', 'href="{{ROOT}}assets/'
    )


def bootstrap_partials() -> tuple[str, str, tuple[int, int]]:
    index_text = INDEX.read_text(encoding="utf-8")
    if HEADER_PARTIAL.exists() and FOOTER_PARTIAL.exists():
        marker_start = index_text.find(HEADER_START)
        marker_end = index_text.find(HEADER_END)
        if marker_start >= 0 and marker_end >= 0:
            index_header_range = (marker_start, marker_end + len(HEADER_END))
        else:
            _, _, index_header_range = extract_index_shell(index_text)
        return (
            HEADER_PARTIAL.read_text(encoding="utf-8").strip(),
            FOOTER_PARTIAL.read_text(encoding="utf-8").strip(),
            index_header_range,
        )

    raw_header, raw_footer, index_header_range = extract_index_shell(index_text)

    PARTIALS_DIR.mkdir(parents=True, exist_ok=True)
    if not HEADER_PARTIAL.exists():
        HEADER_PARTIAL.write_text(
            canonicalize_header(raw_header) + "\n", encoding="utf-8"
        )
    if not FOOTER_PARTIAL.exists():
        FOOTER_PARTIAL.write_text(
            canonicalize_footer(raw_footer) + "\n", encoding="utf-8"
        )

    return (
        HEADER_PARTIAL.read_text(encoding="utf-8").strip(),
        FOOTER_PARTIAL.read_text(encoding="utf-8").strip(),
        index_header_range,
    )


def root_prefix(page: Path) -> str:
    relative = os.path.relpath(ROOT, page.parent).replace(os.sep, "/")
    return "./" if relative == "." else relative.rstrip("/") + "/"


def render(template: str, page: Path) -> str:
    return template.replace("{{ROOT}}", root_prefix(page))


def replace_marked(
    text: str, start_marker: str, end_marker: str, rendered: str
) -> tuple[str, bool]:
    start = text.find(start_marker)
    end = text.find(end_marker)
    if start < 0 or end < 0:
        return text, False
    end += len(end_marker)
    replacement = f"{start_marker}\n{rendered}\n{end_marker}"
    return text[:start] + replacement + text[end:], True


def find_announcement_start(text: str, header_start: int) -> int | None:
    candidates: list[int] = []
    purple = text.rfind('<div class="relative w-full bg-[#4A154B]', 0, header_start)
    if purple >= 0:
        candidates.append(purple)

    for match in re.finditer(
        r'<div\b[^>]*class="[^"]*announcement-marquee[^"]*"[^>]*>',
        text[:header_start],
        re.IGNORECASE,
    ):
        candidates.append(match.start())

    if not candidates:
        return None
    return max(candidates)


def replace_unmarked_header(
    text: str,
    page: Path,
    rendered: str,
    index_header_range: tuple[int, int],
) -> str:
    replacement = f"{HEADER_START}\n{rendered}\n{HEADER_END}"
    if page == INDEX:
        start, end = index_header_range
        return text[:start] + replacement + text[end:]

    header_match = re.search(r"<header\b", text, re.IGNORECASE)
    if header_match:
        start = header_match.start()
        announcement_start = find_announcement_start(text, start)
        if announcement_start is not None:
            start = announcement_start
        end = find_tag_end(text, "header", header_match.start())
        return text[:start] + replacement + text[end:]

    body_match = re.search(r"<body\b[^>]*>", text, re.IGNORECASE)
    if not body_match:
        raise ValueError(f"{page.relative_to(ROOT)} has no <body>")
    insertion = body_match.end()
    return text[:insertion] + "\n\n" + replacement + text[insertion:]


def replace_unmarked_footer(text: str, rendered: str) -> str:
    replacement = f"{FOOTER_START}\n{rendered}\n{FOOTER_END}"
    footer_match = re.search(r"<footer\b", text, re.IGNORECASE)
    if footer_match:
        end = find_tag_end(text, "footer", footer_match.start())
        return text[: footer_match.start()] + replacement + text[end:]

    body_end = text.lower().rfind("</body>")
    if body_end < 0:
        raise ValueError("Page has no closing </body>")
    return text[:body_end] + "\n\n" + replacement + "\n\n" + text[body_end:]


def ensure_shell_script(text: str, page: Path) -> str:
    script = (
        f'<script src="{root_prefix(page)}assets/js/global-shell.js?v=2" defer></script>'
    )
    if SHELL_SCRIPT_PATTERN.search(text):
        return SHELL_SCRIPT_PATTERN.sub(script, text, count=1)

    head_end = text.lower().find("</head>")
    if head_end < 0:
        raise ValueError(f"{page.relative_to(ROOT)} has no closing </head>")
    return text[:head_end] + f"  {script}\n" + text[head_end:]


def normalize_special_pages(text: str, page: Path) -> str:
    if page == ROOT / "pwa" / "offline.html":
        text = text.replace(
            "h-dvh flex flex-col overflow-hidden", "min-h-screen flex flex-col"
        )
    return text


def strip_legacy_bottom_navs(text: str) -> str:
    """Remove the pre-partial hand-coded bottom navs (and the old
    index.html search-overlay that shipped with one of them)."""
    text = LEGACY_NAV_BLOCK.sub("", text)

    idx = text.find('id="mobileSearchOverlay"')
    if idx >= 0:
        div_start = text.rfind("<div", 0, idx)
        if div_start >= 0:
            div_end = find_tag_end(text, "div", div_start)
            rest = text[div_end:]
            script = re.match(
                r"\s*<script>\s*document\.addEventListener\('DOMContentLoaded'.*?</script>",
                rest,
                re.DOTALL,
            )
            text = text[:div_start] + (rest[script.end() :] if script else rest)
    return text


def bottom_nav_for(page: Path) -> Path | None:
    rel = page.relative_to(ROOT).as_posix()
    if rel in NO_BOTTOM_NAV_PAGES:
        return None
    if rel in WALLET_HUB_PAGES:
        return WALLET_NAV_PARTIAL
    return STOREFRONT_NAV_PARTIAL


def html_pages() -> list[Path]:
    pages = []
    for page in ROOT.rglob("*.html"):
        if "node_modules" in page.parts or PARTIALS_DIR in page.parents:
            continue
        pages.append(page)
    return sorted(pages)


def expected_page(
    text: str,
    page: Path,
    header_template: str,
    footer_template: str,
    index_header_range: tuple[int, int],
) -> str:
    rendered_header = render(header_template, page)
    rendered_footer = render(footer_template, page)

    text, header_replaced = replace_marked(
        text, HEADER_START, HEADER_END, rendered_header
    )
    if not header_replaced:
        text = replace_unmarked_header(
            text, page, rendered_header, index_header_range
        )

    text, footer_replaced = replace_marked(
        text, FOOTER_START, FOOTER_END, rendered_footer
    )
    if not footer_replaced:
        text = replace_unmarked_footer(text, rendered_footer)

    text = ensure_shell_script(text, page)
    text = normalize_special_pages(text, page)

    text = strip_legacy_bottom_navs(text)
    nav_partial = bottom_nav_for(page)
    if nav_partial is not None:
        rendered_nav = render(
            nav_partial.read_text(encoding="utf-8").strip(), page
        )
        text, nav_replaced = replace_marked(
            text, BOTTOM_NAV_START, BOTTOM_NAV_END, rendered_nav
        )
        if not nav_replaced:
            body_end = text.lower().rfind("</body>")
            if body_end < 0:
                raise ValueError(
                    f"{page.relative_to(ROOT)} has no closing </body>"
                )
            nav_marked = f"{BOTTOM_NAV_START}\n{rendered_nav}\n{BOTTOM_NAV_END}"
            text = text[:body_end] + "\n\n" + nav_marked + "\n" + text[body_end:]
    return text


def main() -> int:
    args = parse_args()
    header_template, footer_template, index_header_range = bootstrap_partials()
    changed: list[str] = []

    for page in html_pages():
        original = page.read_text(encoding="utf-8")
        expected = expected_page(
            original,
            page,
            header_template,
            footer_template,
            index_header_range,
        )
        relative = str(page.relative_to(ROOT))
        if original != expected:
            changed.append(relative)
            if not args.check:
                page.write_text(expected, encoding="utf-8")

    if args.check and changed:
        print("Global shell is out of sync:", file=sys.stderr)
        for relative in changed:
            print(f"  - {relative}", file=sys.stderr)
        return 1

    action = "Verified" if args.check else "Synchronized"
    print(f"{action} global shell across {len(html_pages())} HTML pages.")
    if changed and not args.check:
        print(f"Updated {len(changed)} page(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
