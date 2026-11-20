"""seed_data.py → 앱에 넣을 JSON 3개 + 검토용 CSV를 만들고, 규칙을 검사한다.

실행: python3 build_seeds.py
출력: out/articles_1119.json, out/seeds_1119.json, out/perspective_map_1119.json, out/seeds_1119.csv
"""
import csv, json, os, re, sys
from seed_data import ARTICLES, DEMO_ANSWERS

EXPECTED_SIZES = [7, 6, 6, 5, 4, 2]          # g1~g6, g6 = 소수 군집(어람작)
LEVEL = {"B": "boksi", "C": "chosi"}
errors = []

def sentences(t):
    return [s for s in re.split(r"(?<=[.?!])\s+", t.strip()) if s]

articles_out, seeds_out, map_out = [], [], []
for a in ARTICLES:
    aid = a["id"]
    seeds_out_a, groups_out = [], []
    counts = {"B": 0, "C": 0}
    for gi, (gid, gname, gdesc) in enumerate(a["groups"]):
        rows = a["seeds"][gid]
        if len(rows) != EXPECTED_SIZES[gi]:
            errors.append(f"{aid}/{gid}: {len(rows)}편 (기대 {EXPECTED_SIZES[gi]})")
        rep_ids, eoram_ids, ids = [], [], []
        for si, (lv, flag, major, year, arg, text) in enumerate(rows, 1):
            sid = f"{aid}_{gid}_{si:02d}"
            n = len(sentences(text))
            if lv == "C" and n != 3:
                errors.append(f"{sid}: 초시 {n}문장 (3문장이어야 함)")
            if lv == "B" and not 4 <= n <= 5:
                errors.append(f"{sid}: 복시 {n}문장 (4~5문장)")
            if flag in ("rep", "eoram") and lv != "B":
                errors.append(f"{sid}: 대표·어람작은 복시여야 함")
            counts[lv] += 1
            ids.append(sid)
            if flag == "rep": rep_ids.append(sid)
            if flag == "eoram": eoram_ids.append(sid)
            seeds_out_a.append({
                "id": sid, "article_id": aid, "level": LEVEL[lv], "group_id": gid, "group_name": gname,
                "text": text, "argument": arg, "writer": f"{major} {year}학년",
                "is_representative": flag in ("rep", "eoram"), "is_eoram": flag == "eoram",
                "source": "seed", "chars": len(text), "sentences": n})
        want = (gi == 5)
        if want and len(eoram_ids) != 1:
            errors.append(f"{aid}/{gid}: 어람작 1편 필요")
        if not want and len(rep_ids) != 1:
            errors.append(f"{aid}/{gid}: 대표 답안 1편 필요")
        groups_out.append({"id": gid, "name": gname, "description": gdesc, "size": len(rows),
                           "share": round(len(rows) / 30, 3), "representative_id": (eoram_ids or rep_ids or [None])[0],
                           "is_minority": want, "seed_ids": ids})
    if counts != {"B": 18, "C": 12}:
        errors.append(f"{aid}: 복시 {counts['B']} / 초시 {counts['C']} (18/12 기대)")
    seeds_out += seeds_out_a
    map_out.append({"article_id": aid, "category": a["category"], "total": len(seeds_out_a),
                    "eoram_id": groups_out[5]["representative_id"], "groups": groups_out})
    art = {k: v for k, v in a.items() if k not in ("seeds", "groups")}
    art["stances"] = [g[1] for g in a["groups"]]
    d = DEMO_ANSWERS[aid]
    if len(sentences(d["text"])) != 5: errors.append(f"{aid}: 예시 답안 5문장 아님")
    art["demo_answer"] = {**d, "stance_name": dict((g[0], g[1]) for g in a["groups"])[d["stance_group"]]}
    articles_out.append(art)

# 같은 기사 안 중복 문장 검사 (복붙 실수 방지)
seen = {}
for s in seeds_out:
    for sen in sentences(s["text"]):
        key = (s["article_id"], sen)
        if key in seen and len(sen) > 25:
            errors.append(f"중복 문장: {seen[key]} / {s['id']}: {sen[:30]}…")
        seen[key] = s["id"]

os.makedirs("out", exist_ok=True)
json.dump(articles_out, open("out/articles_1119.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
json.dump(seeds_out, open("out/seeds_1119.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
json.dump(map_out, open("out/perspective_map_1119.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
with open("out/seeds_1119.csv", "w", encoding="utf-8-sig", newline="") as f:
    w = csv.writer(f)
    w.writerow(["id", "분야", "난이도", "그룹", "대표", "어람작", "글쓴이", "핵심 논거", "본문", "글자 수"])
    cat = {a["id"]: a["category"] for a in ARTICLES}
    for s in seeds_out:
        w.writerow([s["id"], cat[s["article_id"]], "복시" if s["level"] == "boksi" else "초시", s["group_name"],
                    "O" if s["is_representative"] and not s["is_eoram"] else "", "O" if s["is_eoram"] else "",
                    s["writer"], s["argument"], s["text"], s["chars"]])

print(f"기사 {len(articles_out)}편, 시드 {len(seeds_out)}편")
for m in map_out:
    print(f"  [{m['category']}] " + " / ".join(f"{g['name']} {g['size']}" for g in m["groups"]))
b = [s["chars"] for s in seeds_out if s["level"] == "boksi"]; c = [s["chars"] for s in seeds_out if s["level"] == "chosi"]
print(f"평균 글자 수: 복시 {sum(b)//len(b)}자, 초시 {sum(c)//len(c)}자")
if errors:
    print("오류:"); [print("  -", e) for e in errors]; sys.exit(1)
print("검사 통과")
