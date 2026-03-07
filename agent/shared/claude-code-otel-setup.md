# Claude Code OTel 설정 가이드

EO Studio 토큰 대시보드에 사용량이 표시되려면 아래 설정이 필요합니다.
터미널에 명령어를 붙여넣고 엔터 → Claude Code 재시작하면 끝입니다.

대시보드: https://token-dashboard-iota.vercel.app

---

## Jay

```bash
mkdir -p ~/.claude && cat > ~/.claude/managed-settings.json << 'EOF'
{
  "env": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
    "OTEL_METRICS_EXPORTER": "otlp",
    "OTEL_LOGS_EXPORTER": "otlp",
    "OTEL_EXPORTER_OTLP_PROTOCOL": "http/protobuf",
    "OTEL_EXPORTER_OTLP_ENDPOINT": "https://otel-collector-production-2dac.up.railway.app",
    "OTEL_RESOURCE_ATTRIBUTES": "team.name=eostudio,user.email=jay@eostudio.tv"
  }
}
EOF
```

---

## Alex

```bash
mkdir -p ~/.claude && cat > ~/.claude/managed-settings.json << 'EOF'
{
  "env": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
    "OTEL_METRICS_EXPORTER": "otlp",
    "OTEL_LOGS_EXPORTER": "otlp",
    "OTEL_EXPORTER_OTLP_PROTOCOL": "http/protobuf",
    "OTEL_EXPORTER_OTLP_ENDPOINT": "https://otel-collector-production-2dac.up.railway.app",
    "OTEL_RESOURCE_ATTRIBUTES": "team.name=eostudio,user.email=alex@eostudio.tv"
  }
}
EOF
```

---

## Yuna

```bash
mkdir -p ~/.claude && cat > ~/.claude/managed-settings.json << 'EOF'
{
  "env": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
    "OTEL_METRICS_EXPORTER": "otlp",
    "OTEL_LOGS_EXPORTER": "otlp",
    "OTEL_EXPORTER_OTLP_PROTOCOL": "http/protobuf",
    "OTEL_EXPORTER_OTLP_ENDPOINT": "https://otel-collector-production-2dac.up.railway.app",
    "OTEL_RESOURCE_ATTRIBUTES": "team.name=eostudio,user.email=yuna@eostudio.tv"
  }
}
EOF
```

---

## Chris

```bash
mkdir -p ~/.claude && cat > ~/.claude/managed-settings.json << 'EOF'
{
  "env": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
    "OTEL_METRICS_EXPORTER": "otlp",
    "OTEL_LOGS_EXPORTER": "otlp",
    "OTEL_EXPORTER_OTLP_PROTOCOL": "http/protobuf",
    "OTEL_EXPORTER_OTLP_ENDPOINT": "https://otel-collector-production-2dac.up.railway.app",
    "OTEL_RESOURCE_ATTRIBUTES": "team.name=eostudio,user.email=chris@eostudio.tv"
  }
}
EOF
```

---

## 설정 상태

| 이름 | 이메일 | 설정 |
|------|--------|------|
| Seohyun | ash@eoeoeo.net | ✅ 완료 |
| Jay | jay@eostudio.tv | ⬜ |
| Alex | alex@eostudio.tv | ⬜ |
| Yuna | yuna@eostudio.tv | ⬜ |
| Chris | chris@eostudio.tv | ⬜ |
