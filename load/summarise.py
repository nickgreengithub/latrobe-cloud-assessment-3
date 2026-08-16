#!/usr/bin/env python3
"""Turns the per-stage JTL files into one comparison table.

JMeter's own HTML report is per-run, which makes comparing stages a matter of
opening five reports side by side. The interesting question here is what
changes between stages, so this reads them all and prints one table.
"""

import csv
import sys
from pathlib import Path


def percentile(values, fraction):
    if not values:
        return 0
    ordered = sorted(values)
    index = min(len(ordered) - 1, int(round(fraction * (len(ordered) - 1))))
    return ordered[index]


def read_stage(path):
    elapsed, ok, failed, codes = [], 0, 0, {}
    start, end = None, None

    with path.open(newline="") as handle:
        for row in csv.DictReader(handle):
            try:
                elapsed.append(int(row["elapsed"]))
                stamp = int(row["timeStamp"])
            except (KeyError, ValueError):
                continue
            start = stamp if start is None else min(start, stamp)
            end = stamp if end is None else max(end, stamp)
            if row.get("success") == "true":
                ok += 1
            else:
                failed += 1
            code = row.get("responseCode", "?")
            codes[code] = codes.get(code, 0) + 1

    total = ok + failed
    duration = ((end - start) / 1000) if start is not None and end != start else 0
    return {
        "total": total,
        "ok": ok,
        "failed": failed,
        "error_rate": (failed / total * 100) if total else 0,
        "mean": (sum(elapsed) / len(elapsed)) if elapsed else 0,
        "p50": percentile(elapsed, 0.50),
        "p95": percentile(elapsed, 0.95),
        "p99": percentile(elapsed, 0.99),
        "max": max(elapsed) if elapsed else 0,
        "throughput": (total / duration) if duration else 0,
        "codes": codes,
    }


def main():
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "load/results")
    stages = sorted(
        out.glob("x*.jtl"), key=lambda p: int(p.stem.lstrip("x") or 0)
    )
    if not stages:
        print(f"No .jtl files in {out} — run load/run-stages.sh first.")
        return

    print("# JMeter staged load results\n")
    print("| Stage | Requests | Failed | Error % | Mean ms | p50 | p95 | p99 | Max ms | Req/s |")
    print("|---|---|---|---|---|---|---|---|---|---|")

    for path in stages:
        s = read_stage(path)
        print(
            f"| {path.stem} | {s['total']} | {s['failed']} | {s['error_rate']:.1f}% |"
            f" {s['mean']:.0f} | {s['p50']} | {s['p95']} | {s['p99']} |"
            f" {s['max']} | {s['throughput']:.1f} |"
        )

    print("\n## Response codes by stage\n")
    for path in stages:
        s = read_stage(path)
        codes = ", ".join(f"{k}: {v}" for k, v in sorted(s["codes"].items()))
        print(f"- **{path.stem}** — {codes}")


if __name__ == "__main__":
    main()
