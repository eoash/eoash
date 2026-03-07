#!/bin/bash
# OTel 파이프라인 end-to-end 테스트
# 사용법: ./scripts/otel-e2e-test.sh [otel_url] [prometheus_url]
# 기본값: Railway production URLs

OTEL_URL="${1:-https://otel-collector-production-2dac.up.railway.app}"
PROM_URL="${2:-https://prometheus-production-ae90.up.railway.app}"
TEST_METRIC="e2e_pipeline_test_$(date +%s)"

echo "=== OTel 파이프라인 e2e 테스트 ==="
echo "OTel Collector: $OTEL_URL"
echo "Prometheus:     $PROM_URL"
echo ""

# 1. OTel Collector 연결 확인
echo "[1/3] OTel Collector 연결 확인..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$OTEL_URL")
if [ "$STATUS" = "404" ] || [ "$STATUS" = "200" ]; then
  echo "  ✅ OTel Collector 응답 (HTTP $STATUS)"
else
  echo "  ❌ OTel Collector 응답 없음 (HTTP $STATUS)"
  exit 1
fi

# 2. 테스트 메트릭 전송
echo "[2/3] 테스트 메트릭 전송..."
NOW_NS=$(python3 -c "import time; print(int(time.time() * 1e9))")
RESULT=$(curl -s -X POST "$OTEL_URL/v1/metrics" \
  -H "Content-Type: application/json" \
  -d "{
    \"resourceMetrics\": [{
      \"resource\": {
        \"attributes\": [
          {\"key\": \"service.name\", \"value\": {\"stringValue\": \"otel-e2e-test\"}},
          {\"key\": \"team.name\", \"value\": {\"stringValue\": \"eostudio\"}}
        ]
      },
      \"scopeMetrics\": [{
        \"metrics\": [{
          \"name\": \"$TEST_METRIC\",
          \"sum\": {
            \"dataPoints\": [{
              \"asInt\": \"1\",
              \"startTimeUnixNano\": \"$NOW_NS\",
              \"timeUnixNano\": \"$NOW_NS\",
              \"attributes\": [{\"key\": \"test\", \"value\": {\"stringValue\": \"true\"}}]
            }],
            \"aggregationTemporality\": 2,
            \"isMonotonic\": true
          }
        }]
      }]
    }]
  }")
echo "  응답: $RESULT"

# 3. Prometheus에서 확인 (polling)
DASHBOARD_URL="${3:-https://token-dashboard-iota.vercel.app}"
echo "[3/4] Prometheus 수신 확인 (polling, 최대 30초)..."
COUNT=0
for i in $(seq 1 6); do
  QUERY_RESULT=$(curl -s "$PROM_URL/api/v1/query?query=${TEST_METRIC}_total")
  COUNT=$(echo "$QUERY_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',{}).get('result',[])))" 2>/dev/null)
  [ "$COUNT" -gt "0" ] 2>/dev/null && break
  sleep 5
done

echo ""
if [ "$COUNT" -gt "0" ] 2>/dev/null; then
  echo "✅ Prometheus 수신 확인!"
  echo "$QUERY_RESULT" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for r in d.get('data',{}).get('result',[]):
    print(f'  metric={r[\"metric\"].get(\"__name__\",\"?\")} value={r[\"value\"][1]}')
"
else
  echo "❌ 메트릭 미수신 — OTel Collector 또는 Prometheus scrape 설정 확인 필요"
  echo "   Prometheus 타겟 상태: $PROM_URL/api/v1/targets"
  exit 1
fi

# 4. 대시보드 API 헬스체크
echo "[4/4] 대시보드 API 헬스체크..."
API_RESULT=$(curl -s "$DASHBOARD_URL/api/analytics?days=1")
DATA_COUNT=$(echo "$API_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',[])))" 2>/dev/null)
SOURCE=$(echo "$API_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('_source','?'))" 2>/dev/null)

echo ""
if [ "$DATA_COUNT" -gt "0" ] 2>/dev/null; then
  echo "✅ 대시보드 API 정상 — source=$SOURCE, data=$DATA_COUNT건"
else
  echo "⚠️  대시보드 API data=0 — source=$SOURCE (테스트 데이터 없으면 정상일 수 있음)"
fi
