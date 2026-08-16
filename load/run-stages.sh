#!/usr/bin/env bash
#
# Runs the staged load test: x1, x10, x100, x1000 and x10000 RSS clients
# against a running server, writing one JTL per stage plus a summary table.
#
#   ./load/run-stages.sh                 # against http://127.0.0.1:3100
#   HOST=1.2.3.4 PORT=3000 ./load/run-stages.sh
#
# Requires JMeter on PATH and a JDK. On macOS:
#   brew install jmeter
#   export JAVA_HOME=/opt/homebrew/opt/openjdk@21
#
set -euo pipefail

HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-3100}"
OUT="${OUT:-load/results}"
PLAN="load/rss-load.jmx"

# Stage sizes. The first four are true concurrency: one JMeter thread is one
# simulated RSS client, all live at once.
#
# The fifth is not, and it is worth being exact about why. A JVM thread is an
# OS thread, and this machine refuses to create more than about 4,100 of them
# per process (`pthread_create failed (EAGAIN)`); raising it needs system
# configuration, not a JMeter setting. That is a limit of the load generator,
# not of the server under test. So x10000 runs as 10,000 client sessions —
# 2,000 concurrent clients cycling five times — which the brief allows as an
# "equivalent staged load level". See load/README.md.
#
#          threads  loops  ramp(s)
STAGES=(
  "1      20   1"
  "10     10   1"
  "100    5    5"
  "1000   2    30"
  "2000   5    60"
)

mkdir -p "$OUT"

# 10000 OS threads needs headroom JMeter does not take by default.
export JVM_ARGS="${JVM_ARGS:--Xms1g -Xmx4g}"

echo "Target: http://${HOST}:${PORT}"
echo

for stage in "${STAGES[@]}"; do
  read -r threads loops ramp <<<"$stage"
  label="x${threads}"
  jtl="${OUT}/${label}.jtl"
  log="${OUT}/${label}.log"

  echo "── stage ${label}: ${threads} clients × ${loops} loops, ramp ${ramp}s ──"
  rm -f "$jtl" "$log"

  # `|| true`: a stage that fails under load is a result, not a reason to
  # abandon the remaining stages. The failure rate is in the JTL either way.
  jmeter -n -t "$PLAN" -l "$jtl" -j "$log" \
    -Jthreads="$threads" -Jloops="$loops" -Jramp="$ramp" \
    -Jhost="$HOST" -Jport="$PORT" \
    -Jjmeter.save.saveservice.output_format=csv \
    >"${OUT}/${label}.stdout" 2>&1 || true

  tail -3 "${OUT}/${label}.stdout" || true
  echo
done

echo "Writing ${OUT}/summary.md"
python3 load/summarise.py "$OUT" > "${OUT}/summary.md"
cat "${OUT}/summary.md"
