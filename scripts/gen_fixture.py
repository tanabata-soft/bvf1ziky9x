# -*- coding: utf-8 -*-
"""sxtwl で年柱・月柱・日柱の正解フィクスチャを作る（lunar-typescript との突き合わせ用）"""
import json, sxtwl

GAN = "甲乙丙丁戊己庚辛壬癸"
ZHI = "子丑寅卯辰巳午未申酉戌亥"

CASES = [
    # name, y, m, d, hour, minute  （hour は lunar 側の入力。sxtwl は日単位）
    ("lichun-before",   2024, 2, 3, 12, 0),
    ("lichun-day-am",   2024, 2, 4, 12, 0),
    ("lichun-day-pm",   2024, 2, 4, 18, 0),
    ("lichun-after",    2024, 2, 5, 12, 0),
    ("leap-day",        2024, 2, 29, 12, 0),
    ("jingzhe-before",  2024, 3, 5, 9, 0),
    ("jingzhe-after",   2024, 3, 5, 12, 0),
    ("plain-1990",      1990, 6, 15, 8, 0),
    ("newyear-2000",    2000, 1, 1, 0, 30),
    ("hour-23",         2023, 12, 31, 23, 30),
    ("known-chart",     1917, 7, 22, 12, 0),
    ("summer-solstice", 2025, 6, 21, 12, 0),
]

out = []
for name, y, m, d, hh, mm in CASES:
    day = sxtwl.fromSolar(y, m, d)
    yg, mg, dg = day.getYearGZ(), day.getMonthGZ(), day.getDayGZ()
    out.append({
        "name": name, "y": y, "m": m, "d": d, "hour": hh, "minute": mm,
        "sxtwl": {
            "year": GAN[yg.tg] + ZHI[yg.dz],
            "month": GAN[mg.tg] + ZHI[mg.dz],
            "day": GAN[dg.tg] + ZHI[dg.dz],
        },
    })
    print(name, out[-1]["sxtwl"])

with open("tests/fixtures/gz.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print("fixture written")
