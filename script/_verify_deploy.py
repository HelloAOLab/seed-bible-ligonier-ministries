# -*- coding: utf-8 -*-
"""End-to-end live verification: the bytes on api.ao.bot's S3 CDN are exactly
what we uploaded, and they carry the documented remediation signatures."""
import json, urllib.request, hashlib, sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

LOCAL_JSON = r"C:\Users\ahmed\AppData\Local\Temp\ligonier-study-notes\md-extracted-json-normalized"
BOOK_FILE = {
    "GEN":"Gen","EXO":"Ex","LEV":"Lev","NUM":"Num","DEU":"Deut","JOS":"Josh","JDG":"Judg","RUT":"Ruth",
    "1SA":"1Sam","2SA":"2Sam","1KI":"1Kings","2KI":"2Kings","1CH":"1Chr","2CH":"2Chr",
    "EZR":"Ezra","NEH":"Neh","EST":"Esth","JOB":"Job","PSA":"Ps","PRO":"Prov","ECC":"Eccl","SNG":"Song",
    "ISA":"Is","JER":"Jer","LAM":"Lam","EZK":"Ezek","DAN":"Dan","HOS":"Hos","JOL":"Joel","AMO":"Amos",
    "OBA":"Obad","JON":"Jonah","MIC":"Mic","NAM":"Nah","HAB":"Hab","ZEP":"Zeph","HAG":"Hag","ZEC":"Zech","MAL":"Mal",
    "MAT":"Matt","MRK":"Mark","LUK":"Luke","JHN":"John","ACT":"Acts","ROM":"Rom",
    "1CO":"1Cor","2CO":"2Cor","GAL":"Gal","EPH":"Eph","PHP":"Phil","COL":"Col",
    "1TH":"1Thess","2TH":"2Thess","1TI":"1Tim","2TI":"2Tim","TIT":"Titus","PHM":"Philem",
    "HEB":"Heb","JAS":"James","1PE":"1Pet","2PE":"2Pet","1JN":"1John","2JN":"2John","3JN":"3John","JUD":"Jude","REV":"Rev",
}

tags = json.load(open("dist/studyNoteV3-tags.json", encoding="utf-8"))
print(f"Verifying live deploy on api.ao.bot ({len(tags)} books mapped)\n")

samples = {
    "PSA":  ("L<small>ORD</small>", 200, "Phase B C6 small-caps walk applied (target: 210 in Ps)"),
    "GEN":  ("(Is. 42:4)",            1, "Phase 3 B1 fix: bare 42:4 inherits Is. (not Gen.)"),
    "LEV":  ("23:26",                 1, "Phase 4 D1 insert: Lev 23:26-32 Day of Atonement"),
    "NAM":  ("2:9",                   1, "Phase 4 D1 insert: Nah 2:9 Plunder"),
    "2SA":  ("as king",               1, "Phase 5 OCR fix: 2 Sam 3:17 lemma (was 'asking')"),
    "AMO":  ("(Hos. 8:14)",           1, "Final-audit fix: Hosea ref (was 'Hosea (Amos 8:14)')"),
    "LUK":  ("(Mark 10:35–45)",  1, "Final-audit fix: Phase C regression"),
    "JOL":  (None,                 None, "Unchanged baseline book (already-stored on upload)"),
}

ok_count = 0
for book, (signature, min_count, why) in samples.items():
    url = tags[book]
    print(f"  {book:5}  {url[-50:]}")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "rsb-verify/1.0"})
        with urllib.request.urlopen(req, timeout=20) as r:
            body = r.read()
            status = r.status
        h = hashlib.sha256(body).hexdigest()
        expected = url.rsplit("/", 1)[-1].replace(".json", "")
        local_path = os.path.join(LOCAL_JSON, f"{BOOK_FILE[book]}_studyNote.json")
        local_bytes = open(local_path, "rb").read()
        local_h = hashlib.sha256(local_bytes).hexdigest()

        text = body.decode("utf-8")
        sig_count = text.count(signature) if signature else 0
        sig_ok = signature is None or sig_count >= min_count

        cdn_eq_url   = (h == expected)
        cdn_eq_local = (h == local_h)
        all_ok = (status == 200 and cdn_eq_url and cdn_eq_local and sig_ok)

        mark = "PASS" if all_ok else "FAIL"
        print(f"         [{mark}] HTTP {status}  size={len(body):>8,}  cdn-sha==url-sha: {cdn_eq_url}  cdn==local: {cdn_eq_local}")
        if signature:
            print(f"         remediation signature {signature!r} found {sig_count}x (need >={min_count}) -- {why}")
        else:
            print(f"         baseline check -- {why}")
        if all_ok: ok_count += 1
    except Exception as e:
        print(f"         [FAIL] {e}")

print(f"\n{ok_count}/{len(samples)} books verified live on api.ao.bot")
