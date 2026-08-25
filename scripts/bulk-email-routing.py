#!/usr/bin/env python3
"""
Bulk-create Cloudflare Email Routing destinations and routing rules.

Adding a hundred addresses through the dashboard is unbearable; this does it
from a plain text file. Uses only the Python standard library.

Setup (the account owner does this once):

  1. Cloudflare dashboard -> My Profile -> API Tokens -> Create Token
     -> Create Custom Token, with EXACTLY these permissions:
          Account | Email Routing Addresses | Edit
          Zone    | Email Routing Rules     | Edit
     Scope it to the mlopsmena.com account/zone only.
  2. Copy the token. This token CANNOT read or change DNS, so whoever holds it
     cannot take the website down.
  3. Account ID and Zone ID are on the domain's Overview page, lower right.

Usage:

  export CF_API_TOKEN=...
  export CF_ACCOUNT_ID=...
  export CF_ZONE_ID=...            # only needed with --rules

  python3 bulk-email-routing.py people.txt --dry-run
  python3 bulk-email-routing.py people.txt
  python3 bulk-email-routing.py people.txt --rules

Input file — one entry per line, blank lines and # comments ignored:

  someone@gmail.com                 # destination only
  someone@gmail.com, someone        # also route someone@<domain> -> that inbox

Every destination must still be confirmed by its owner: Cloudflare emails each
person a verification link. Nothing this script does can bypass that, and mail
is dropped until they click it.
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request

API = "https://api.cloudflare.com/client/v4"


def call(method, path, token, body=None):
    """One API call. Returns (ok, payload_or_errors)."""
    req = urllib.request.Request(
        f"{API}{path}",
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return True, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try:
            return False, json.loads(e.read())
        except Exception:
            return False, {"errors": [{"message": f"HTTP {e.code}"}]}
    except Exception as e:                       # network, timeout, DNS
        return False, {"errors": [{"message": str(e)}]}


def errmsg(payload):
    errs = payload.get("errors") or []
    return "; ".join(str(e.get("message", e)) for e in errs) or "unknown error"


def parse_file(path):
    """-> [(email, localpart_or_None)], preserving order, de-duplicated."""
    entries, seen = [], set()
    with open(path, encoding="utf-8") as fh:
        for lineno, raw in enumerate(fh, 1):
            line = raw.split("#", 1)[0].strip()
            if not line:
                continue
            parts = [p.strip() for p in line.split(",")]
            email = parts[0]
            local = parts[1] if len(parts) > 1 and parts[1] else None
            if "@" not in email:
                print(f"  ! line {lineno}: not an email address: {email!r}")
                continue
            key = email.lower()
            if key in seen:
                print(f"  · line {lineno}: duplicate, skipping {email}")
                continue
            seen.add(key)
            entries.append((email, local))
    return entries


def existing_destinations(token, account):
    """Every destination already on the account, lowercased."""
    found, page = {}, 1
    while True:
        ok, res = call("GET", f"/accounts/{account}/email/routing/addresses"
                              f"?per_page=50&page={page}", token)
        if not ok:
            print(f"  ! could not list destinations: {errmsg(res)}")
            return found
        for item in res.get("result") or []:
            found[item["email"].lower()] = item.get("verified") is not None
        info = res.get("result_info") or {}
        if page * info.get("per_page", 50) >= info.get("total_count", 0):
            break
        page += 1
    return found


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("file", help="text file of destination emails")
    ap.add_argument("--rules", action="store_true",
                    help="also create routing rules (needs CF_ZONE_ID and a localpart)")
    ap.add_argument("--domain", default="mlopsmena.com")
    ap.add_argument("--dry-run", action="store_true", help="show what would happen")
    ap.add_argument("--delay", type=float, default=1.5,
                    help="seconds between calls; Cloudflare throttles verification mail")
    args = ap.parse_args()

    token = os.environ.get("CF_API_TOKEN")
    account = os.environ.get("CF_ACCOUNT_ID")
    zone = os.environ.get("CF_ZONE_ID")
    # A dry run only reads the input file, so it needs no credentials — that
    # lets whoever prepares the list sanity-check it before a token exists.
    if not args.dry_run:
        if not token or not account:
            sys.exit("Set CF_API_TOKEN and CF_ACCOUNT_ID first "
                     "(see the header of this file).")
        if args.rules and not zone:
            sys.exit("--rules also needs CF_ZONE_ID.")

    entries = parse_file(args.file)
    if not entries:
        sys.exit("Nothing to do — no valid addresses in that file.")
    print(f"\nParsed {len(entries)} address(es) from {args.file}")

    if args.dry_run:
        print("\nDRY RUN — nothing will be created.\n")
        for email, local in entries:
            rule = f"  ->  {local}@{args.domain}" if (local and args.rules) else ""
            print(f"  destination: {email}{rule}")
        print(f"\n{len(entries)} destination(s) would be created.")
        return

    print("Fetching existing destinations…")
    already = existing_destinations(token, account)
    print(f"  {len(already)} already on the account "
          f"({sum(already.values())} verified)\n")

    created = skipped = failed = rules_made = 0

    for i, (email, local) in enumerate(entries, 1):
        tag = f"[{i}/{len(entries)}]"

        if email.lower() in already:
            state = "verified" if already[email.lower()] else "pending"
            print(f"  {tag} · {email} — already exists ({state})")
            skipped += 1
        else:
            ok, res = call("POST", f"/accounts/{account}/email/routing/addresses",
                           token, {"email": email})
            if ok:
                print(f"  {tag} + {email} — created, verification email sent")
                created += 1
            else:
                msg = errmsg(res)
                # Cloudflare throttles verification mail; back off and retry once.
                if "too recently" in msg.lower() or "rate" in msg.lower():
                    print(f"  {tag} … rate limited, waiting 30s")
                    time.sleep(30)
                    ok, res = call("POST",
                                   f"/accounts/{account}/email/routing/addresses",
                                   token, {"email": email})
                    if ok:
                        print(f"  {tag} + {email} — created on retry")
                        created += 1
                    else:
                        print(f"  {tag} ! {email} — {errmsg(res)}")
                        failed += 1
                else:
                    print(f"  {tag} ! {email} — {msg}")
                    failed += 1
            time.sleep(args.delay)

        if args.rules and local:
            addr = f"{local}@{args.domain}"
            ok, res = call("POST", f"/zones/{zone}/email/routing/rules", token, {
                "name": addr,
                "enabled": True,
                "matchers": [{"type": "literal", "field": "to", "value": addr}],
                "actions": [{"type": "forward", "value": [email]}],
            })
            if ok:
                print(f"        rule {addr} -> {email}")
                rules_made += 1
            else:
                print(f"        ! rule {addr}: {errmsg(res)}")
            time.sleep(args.delay)

    print(f"\n{'-' * 52}")
    print(f"  created {created}   skipped {skipped}   failed {failed}"
          + (f"   rules {rules_made}" if args.rules else ""))
    print(f"{'-' * 52}")
    if created:
        print("\nEach new address is PENDING until its owner clicks the "
              "verification\nlink Cloudflare just emailed them. Mail is dropped "
              "until they do.")


if __name__ == "__main__":
    main()
