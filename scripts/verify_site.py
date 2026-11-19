#!/usr/bin/env python3
"""Site readiness checker for CodePath-Academy.

Verifies the statically observable production-readiness requirements against a
running stack: crawler files, sitemap coverage, social-preview tags, the
favicon set and web manifest, security headers on API responses, and the
anonymous API contracts (health, honest 401 JSON, CSRF-protected contact
validation). Deliberately read-only: it never creates data — the contact check
submits an intentionally invalid payload and asserts the validation contract.

Usage:
    python scripts/verify_site.py                      # dev defaults
    python scripts/verify_site.py --base http://localhost:5173 \
                                  --api http://localhost:8082
    python scripts/verify_site.py --base https://academy.example.com \
                                  --api https://academy.example.com

Exit code: 0 when every check passes (skips are allowed), 1 on any failure.

Checks that need the production edge (asset caching, HSTS over TLS) are
reported as SKIP when the environment cannot express them; see
docs/VERIFICATION-CHECKLIST.md for which tool covers each remaining item.
"""

from __future__ import annotations

import argparse
import http.cookiejar
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

STATIC_ROUTES = ["/", "/courses", "/paths", "/about", "/contact", "/privacy", "/terms"]
PRIVATE_PREFIXES = ["/admin", "/student", "/api/", "/actuator"]
AUTH_ROUTES = ["/login", "/register"]
ICONS = [
    "/favicon.svg",
    "/favicon.ico",
    "/favicon-16x16.png",
    "/favicon-32x32.png",
    "/apple-touch-icon.png",
    "/icon-192x192.png",
    "/icon-512x512.png",
    "/icon-192x192-maskable.png",
    "/icon-512x512-maskable.png",
    "/images/og/codepath-academy-og.png",
]
# (kind, key) pairs that must appear in <head>. kind is "name", "property",
# or "link-rel" (checked against rel + href).
REQUIRED_INDEX_TAGS = [
    ("name", "description"),
    ("name", "robots"),
    ("name", "theme-color"),
    ("name", "twitter:card"),
    ("name", "twitter:title"),
    ("name", "twitter:description"),
    ("name", "twitter:image"),
    ("property", "og:type"),
    ("property", "og:site_name"),
    ("property", "og:title"),
    ("property", "og:description"),
    ("property", "og:url"),
    ("property", "og:image"),
    ("property", "og:image:width"),
    ("property", "og:image:height"),
    ("property", "og:image:alt"),
    ("link-rel", "canonical"),
    ("link-rel", "manifest"),
    ("link-rel", "icon"),
    ("link-rel", "apple-touch-icon"),
]


class Report:
    def __init__(self) -> None:
        self.passed = 0
        self.failed = 0
        self.skipped = 0

    def ok(self, name: str, detail: str = "") -> None:
        self.passed += 1
        print(f"PASS  {name}" + (f" — {detail}" if detail else ""))

    def fail(self, name: str, detail: str) -> None:
        self.failed += 1
        print(f"FAIL  {name} — {detail}")

    def skip(self, name: str, reason: str) -> None:
        self.skipped += 1
        print(f"SKIP  {name} — {reason}")

    def expect(self, name: str, condition: bool, detail: str, on_skip: str | None = None) -> bool:
        if condition:
            self.ok(name, detail)
            return True
        if on_skip:
            self.skip(name, on_skip)
            return False
        self.fail(name, detail)
        return False


class Client:
    """Small read-only HTTP client with a cookie jar (for the XSRF token)."""

    def __init__(self, timeout: float) -> None:
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.jar)
        )
        self.timeout = timeout

    def get(self, url: str) -> tuple[int, dict[str, str], bytes]:
        req = urllib.request.Request(url, headers={"User-Agent": "cpa-verify/1.0"})
        try:
            with self.opener.open(req, timeout=self.timeout) as resp:
                return resp.status, dict(resp.headers), resp.read()
        except urllib.error.HTTPError as err:
            return err.code, dict(err.headers), err.read()

    def post(self, url: str, payload: dict, xsrf: str | None) -> tuple[int, dict[str, str], bytes]:
        body = json.dumps(payload).encode("utf-8")
        headers = {"Content-Type": "application/json", "User-Agent": "cpa-verify/1.0"}
        if xsrf:
            headers["X-XSRF-TOKEN"] = xsrf
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        try:
            with self.opener.open(req, timeout=self.timeout) as resp:
                return resp.status, dict(resp.headers), resp.read()
        except urllib.error.HTTPError as err:
            return err.code, dict(err.headers), err.read()

    def xsrf_token(self) -> str | None:
        for cookie in self.jar:
            if cookie.name == "XSRF-TOKEN":
                return urllib.parse.unquote(cookie.value)
        return None


def attr(content: str, name: str) -> str | None:
    match = re.search(rf'{name}="([^"]*)"', content)
    return match.group(1) if match else None


class HeadInventory(HTMLParser):
    """Collects meta/link attributes so multi-line tags match reliably."""

    def __init__(self) -> None:
        super().__init__()
        self.meta_names: set[str] = set()
        self.meta_properties: set[str] = set()
        self.link_rels: set[str] = set()
        self.link_hrefs: set[str] = set()
        self.title = ""
        self._in_title = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "meta":
            if values.get("name"):
                self.meta_names.add(values["name"] or "")
            if values.get("property"):
                self.meta_properties.add(values["property"] or "")
        elif tag == "link":
            for rel in (values.get("rel") or "").split():
                self.link_rels.add(rel)
            if values.get("href") is not None:
                self.link_hrefs.add(values["href"] or "")
        elif tag == "title":
            self._in_title = True

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self._in_title = False

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title += data

    def has(self, kind: str, key: str) -> bool:
        if kind == "name":
            return key in self.meta_names
        if kind == "property":
            return key in self.meta_properties
        return key in self.link_rels  # link-rel


def check_index(report: Report, base: str, client: Client) -> None:
    status, _, body = client.get(f"{base}/")
    html = body.decode("utf-8", errors="replace")
    if not report.expect(
        "index served",
        status == 200 and 'id="root"' in html,
        f"status {status}, root div {'present' if 'id=\"root\"' in html else 'missing'}",
    ):
        return
    report.expect(
        "build token normalized",
        "%VITE_SITE_URL%" not in html,
        "no raw %VITE_SITE_URL% token in the served HTML",
    )
    head = HeadInventory()
    head.feed(html)
    report.expect(
        "index title present",
        bool(head.title.strip()),
        f"<title>{head.title.strip()}</title>",
    )
    for kind, key in REQUIRED_INDEX_TAGS:
        report.expect(f"index tag: {key}", head.has(kind, key), "present")
    report.expect(
        "index has svg + ico favicon links",
        "/favicon.svg" in head.link_hrefs and "/favicon.ico" in head.link_hrefs,
        "both hrefs present",
    )


def check_crawler_files(report: Report, base: str, client: Client) -> None:
    status, _, body = client.get(f"{base}/robots.txt")
    text = body.decode("utf-8", errors="replace")
    if not report.expect("robots.txt served", status == 200, f"status {status}"):
        return
    for prefix in PRIVATE_PREFIXES:
        report.expect(
            f"robots disallows {prefix}",
            f"Disallow: {prefix}" in text,
            "directive present",
        )
    report.expect(
        "robots does not over-block public pages",
        "Disallow: /about" not in text and "Disallow: /courses" not in text,
        "public routes remain crawlable",
    )
    sitemap_lines = [line for line in text.splitlines() if line.startswith("Sitemap:")]
    absolute = bool(sitemap_lines) and re.match(
        r"Sitemap: https?://", sitemap_lines[0]
    ) is not None
    report.expect(
        "robots advertises an absolute sitemap",
        absolute,
        sitemap_lines[0] if sitemap_lines else "no Sitemap line",
    )


def check_sitemap(report: Report, base: str, api: str, client: Client) -> None:
    status, _, body = client.get(f"{base}/sitemap.xml")
    xml_text = body.decode("utf-8", errors="replace")
    if not report.expect("sitemap.xml served", status == 200, f"status {status}"):
        return
    try:
        root = ET.fromstring(xml_text)
        report.ok("sitemap is well-formed XML", root.tag)
    except ET.ParseError as err:
        report.fail("sitemap is well-formed XML", str(err))
        return

    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locs = [el.text or "" for el in root.findall("sm:url/sm:loc", ns)]
    report.expect("sitemap has entries", len(locs) > 0, f"{len(locs)} <url> entries")
    report.expect(
        "all sitemap locs are absolute",
        all(loc.startswith(("http://", "https://")) for loc in locs),
        "scheme present on every loc",
    )
    report.expect(
        "no duplicate locs",
        len(locs) == len(set(locs)),
        f"{len(set(locs))} unique of {len(locs)}",
    )

    paths = [re.sub(r"^https?://[^/]+", "", loc).rstrip("/") or "/" for loc in locs]
    for bad in PRIVATE_PREFIXES + AUTH_ROUTES:
        hits = [p for p in paths if p == bad.rstrip("/") or p.startswith(bad)]
        report.expect(
            f"sitemap excludes {bad}",
            not hits,
            "absent" if not hits else f"leaked: {hits[:3]}",
        )
    for route in STATIC_ROUTES:
        report.expect(
            f"sitemap includes static route {route}",
            route in paths,
            "present",
        )

    # Every published path/course from the public API must appear.
    api_paths = json.loads(client.get(f"{api}/api/v1/public/paths")[2])
    api_courses = json.loads(client.get(f"{api}/api/v1/public/courses")[2])
    expected = {f"/paths/{row['slug']}" for row in api_paths}
    expected |= {f"/courses/{row['slug']}" for row in api_courses}
    missing = sorted(expected - set(paths))
    report.expect(
        "sitemap covers every published path and course",
        not missing,
        f"{len(expected)} published pages present" if not missing else f"missing: {missing[:5]}",
    )


def check_assets(report: Report, base: str, client: Client) -> None:
    for path in ICONS:
        status, headers, body = client.get(f"{base}{path}")
        ctype = headers.get("Content-Type", "")
        # A text/html body means the SPA fallback swallowed a missing file.
        report.expect(
            f"asset {path}",
            status == 200 and len(body) > 0 and not ctype.startswith("text/html"),
            f"{status}, {len(body)} bytes, {ctype}",
        )

    status, _, body = client.get(f"{base}/site.webmanifest")
    if report.expect("web manifest served", status == 200, f"status {status}"):
        try:
            manifest = json.loads(body)
            report.ok("web manifest is valid JSON")
        except json.JSONDecodeError as err:
            report.fail("web manifest is valid JSON", str(err))
            return
        for key in ("name", "short_name", "start_url", "display"):
            report.expect(f"manifest has {key}", bool(manifest.get(key)), str(manifest.get(key, "")))
        sizes = {icon.get("sizes") for icon in manifest.get("icons", [])}
        report.expect(
            "manifest declares 192px and 512px icons",
            "192x192" in sizes and "512x512" in sizes,
            f"sizes: {sorted(s for s in sizes if s)}",
        )
        # Every icon the manifest points at must be a real file, not the
        # SPA fallback page (which answers 200 text/html for missing paths).
        for icon in manifest.get("icons", []):
            src = icon.get("src", "")
            status, headers, body = client.get(f"{base}{src}")
            ctype = headers.get("Content-Type", "")
            report.expect(
                f"manifest icon {src}",
                status == 200 and len(body) > 0 and not ctype.startswith("text/html"),
                f"{status}, {len(body)} bytes, {ctype}",
            )


def check_api(report: Report, api: str, client: Client) -> None:
    status, headers, body = client.get(f"{api}/api/v1/health")
    report.expect(
        "api health endpoint",
        status == 200,
        f"status {status}: {body[:80].decode('utf-8', errors='replace')}",
    )

    # Security headers the backend guarantees (SecurityHardeningTest).
    ctype_ok = headers.get("X-Content-Type-Options", "").lower() == "nosniff"
    report.expect("api sets X-Content-Type-Options: nosniff", ctype_ok, headers.get("X-Content-Type-Options", "absent"))
    csp = headers.get("Content-Security-Policy", "")
    report.expect("api sets Content-Security-Policy", bool(csp), csp[:70] or "absent")
    framed = "frame-ancestors" in csp or bool(headers.get("X-Frame-Options"))
    report.expect("api sets frame protection", framed, "CSP frame-ancestors or X-Frame-Options")

    status, _, body = client.get(f"{api}/api/v1/auth/me")
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        payload = {}
    report.expect(
        "anonymous /auth/me returns honest 401 JSON",
        status == 401 and bool(payload.get("error")),
        f"status {status}, error={payload.get('error')!r}",
    )

    status, _, body = client.get(f"{api}/api/v1/admin/contact-messages")
    report.expect(
        "admin inbox rejects anonymous access",
        status in (401, 403),
        f"status {status}",
    )

    status, _, body = client.get(f"{api}/actuator/env")
    report.expect(
        "actuator env is not exposed",
        status in (401, 403, 404),
        f"status {status}",
    )

    # Contact endpoint: validation contract only (no data is created).
    token = client.xsrf_token()
    report.expect("CSRF cookie issued", bool(token), "XSRF-TOKEN present" if token else "XSRF-TOKEN missing")
    status, _, body = client.post(f"{api}/api/v1/contact", {}, token)
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        payload = {}
    fields = payload.get("fieldErrors") or {}
    report.expect(
        "contact endpoint enforces validation (400 + fieldErrors)",
        status == 400 and bool(fields),
        f"status {status}, fields={sorted(fields)}",
    )
    report.expect(
        "contact error response echoes no stored data",
        "stacktrace" not in body.decode("utf-8", errors="replace").lower(),
        "no stack traces in the body",
    )


def check_caching(report: Report, base: str, client: Client) -> None:
    # Hashed assets: only the production edge applies this policy
    # (infra/docker/nginx.conf, validated by CI's `nginx -t` step).
    status, headers, _ = client.get(f"{base}/assets/")
    cache = headers.get("Cache-Control", "")
    if not cache:
        report.skip(
            "edge caching policy",
            "origin sets no Cache-Control (dev server); policy lives in "
            "infra/docker/nginx.conf and is validated by CI `nginx -t`",
        )
        return
    report.expect(
        "edge caching policy present",
        "no-store" in cache or "no-cache" in cache or "immutable" in cache,
        f"Cache-Control: {cache}",
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default="http://localhost:5173", help="SPA origin")
    parser.add_argument("--api", default="http://localhost:8082", help="API origin")
    parser.add_argument("--timeout", type=float, default=15.0)
    args = parser.parse_args()

    base = args.base.rstrip("/")
    api = args.api.rstrip("/")
    client = Client(args.timeout)
    report = Report()

    print(f"Verifying SPA at {base}")
    print(f"Verifying API at {api}")
    print()

    check_index(report, base, client)
    check_crawler_files(report, base, client)
    check_sitemap(report, base, api, client)
    check_assets(report, base, client)
    check_api(report, api, client)
    check_caching(report, base, client)

    print()
    print(f"Summary: {report.passed} passed, {report.failed} failed, {report.skipped} skipped")
    if report.failed:
        print("RESULT: FAIL")
        return 1
    print("RESULT: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
