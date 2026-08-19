#!/usr/bin/env python3
"""文档一致性检查。CI 和 /status 都用它。"""
import re, sys, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FEATURES = ROOT / "docs/product/features"
DECISIONS = ROOT / "docs/decisions"
CONTRACTS = ROOT / "contracts"

errors, warnings, rows = [], [], []


def parse_fm(path):
    text = path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        return None
    fm, block = {}, m.group(1)
    for line in block.splitlines():
        if ":" not in line or line.startswith(" "):
            continue
        k, v = line.split(":", 1)
        v = v.split("#")[0].strip()
        if v.startswith("[") and v.endswith("]"):
            inner = v[1:-1].strip()
            v = [x.strip().strip("'\"") for x in inner.split(",")] if inner else []
        fm[k.strip()] = v
    return fm


def contract_text():
    if not CONTRACTS.exists():
        return ""
    out = []
    for p in CONTRACTS.rglob("*"):
        if p.is_file() and p.suffix in {".yaml", ".yml", ".json", ".proto", ".ts"}:
            out.append(p.read_text(encoding="utf-8", errors="ignore"))
    return "\n".join(out)


def main():
    if not FEATURES.exists():
        print("✗ 找不到 docs/product/features/")
        return 1

    adr_ids = {m.group(1) for p in DECISIONS.glob("ADR-*.md")
               if (m := re.match(r"(ADR-\d+)", p.name))}
    ctext = contract_text()

    for spec in sorted(FEATURES.glob("*/spec.md")):
        d = spec.parent
        fid = d.name
        fm = parse_fm(spec)
        if fm is None:
            errors.append(f"{fid}: spec.md 缺少 frontmatter")
            continue

        status = fm.get("status", "?")
        rows.append({
            "id": fm.get("id", fid),
            "title": fm.get("title", ""),
            "status": status,
            "version": fm.get("version", ""),
            "owners": fm.get("owners", []),
        })

        # ADR 引用必须存在
        for a in fm.get("adrs", []):
            if a and a not in adr_ids:
                errors.append(f"{fid}: 引用了不存在的 {a}")

        # 声明的契约必须在 contracts/ 中出现
        for c in fm.get("contracts", []):
            if c and ctext and c.split()[-1] not in ctext:
                warnings.append(f"{fid}: 契约 `{c}` 未在 contracts/ 中找到")

        # shipped 必须有验收且已勾选
        acc = d / "acceptance.md"
        if status == "shipped":
            if not acc.exists():
                errors.append(f"{fid}: status=shipped 但缺少 acceptance.md")
            elif "☐" in acc.read_text(encoding="utf-8"):
                errors.append(f"{fid}: status=shipped 但验收项未全部勾选")

        # 未决问题
        oq = d / "open-questions.md"
        pending = 0
        if oq.exists():
            pending = oq.read_text(encoding="utf-8").count("⏳")
        if status in ("agreed", "implementing", "shipped") and pending:
            warnings.append(f"{fid}: status={status} 但仍有 {pending} 条未决问题")
        rows[-1]["pending"] = pending

    if "--report" in sys.argv:
        print(json.dumps({"features": rows, "errors": errors,
                          "warnings": warnings}, ensure_ascii=False, indent=2))
        return 0

    if "--update-index" in sys.argv:
        idx = FEATURES / "INDEX.md"
        lines = ["# 功能索引", "",
                 "<!-- 由 scripts/check-docs.py --update-index 自动维护 -->", "",
                 "| ID | 名称 | 状态 | 版本 | 涉及端 | 未决 |",
                 "|---|---|---|---|---|---|"]
        for r in rows:
            owners = ", ".join(r["owners"]) if isinstance(r["owners"], list) else r["owners"]
            lines.append(f"| {r['id']} | {r['title']} | {r['status']} | "
                         f"{r['version']} | {owners} | {r.get('pending', 0)} |")
        idx.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"✓ 已更新 {idx.relative_to(ROOT)}")

    for w in warnings:
        print(f"⚠ {w}")
    for e in errors:
        print(f"✗ {e}")
    if not errors and not warnings:
        print(f"✓ {len(rows)} 个 feature，文档一致性检查通过")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
