# {{ workspace_name }} 신규 입사자 온보딩 가이드

> **자동 생성일**: {{ generated_at }}
> 이 문서는 AI가 Slack과 Notion 데이터를 분석하여 자동으로 생성했습니다.
> 내용이 부정확하거나 추가가 필요하면 HR팀에 알려주세요.

---

## 1. 회사 문화 핵심 키워드

우리 조직에서 가장 자주 이야기되고, 가장 중요하게 다뤄지는 개념들입니다.
이 키워드들이 우리 팀의 문화와 방향성을 담고 있습니다.

{% if keywords %}
| 순위 | 키워드 | 언급 횟수 |
|------|--------|-----------|
{% for kw in keywords %}| {{ loop.index }} | **{{ kw.keyword }}** | {{ kw.count }}회 |
{% endfor %}

> **요약**: 우리 팀의 핵심 가치는 **{{ keyword_str }}** 입니다.
{% else %}
- (수집된 데이터가 없습니다. 시스템 관리자에게 문의하세요.)
{% endif %}

---

## 2. 최근 주요 공지사항

팀에서 최근 중요하게 다뤄진 공지사항입니다. 꼭 확인하세요.

{% if pinned_notices %}
### 📌 핀된 공지 (반드시 읽어야 할 내용)

{% for notice in pinned_notices %}
#### {{ loop.index }}. [{{ notice.date }}] #{{ notice.channel }}

{{ notice.text[:300] }}{% if notice.text|length > 300 %}...{% endif %}

{% if notice.has_files %}> 파일 첨부 있음{% endif %}

---
{% endfor %}
{% endif %}

{% if recent_notices %}
### 최근 공지

{% for notice in recent_notices %}
#### {{ loop.index }}. [{{ notice.date }}] #{{ notice.channel }}

{{ notice.text[:300] }}{% if notice.text|length > 300 %}...{% endif %}

{% if notice.has_files %}> 파일 첨부 있음{% endif %}

---
{% endfor %}
{% endif %}

{% if not notices %}
- (공지사항 데이터가 없습니다.)
{% endif %}

---

## 3. 필독 Notion 문서

업무를 시작하기 전에 반드시 읽어야 할 핵심 문서들입니다.
최근 수정일 기준으로 중요도가 높은 문서를 선정했습니다.

{% if must_read_pages %}
{% for page in must_read_pages %}
### {{ loop.index }}. {{ page.title }}

- **최종 수정**: {{ page.last_edited_time[:10] if page.last_edited_time else "알 수 없음" }}
{% if page.url %}- **링크**: [Notion에서 열기]({{ page.url }}){% endif %}

{% if page.content_preview %}> {{ page.content_preview[:200] }}{% if page.content_preview|length >= 200 %}...{% endif %}{% endif %}

{% endfor %}
{% else %}
- (Notion 페이지 데이터가 없습니다.)
{% endif %}

---

## 4. 알아야 할 Slack 채널

업무에 필요한 주요 Slack 채널 목록입니다. 모두 가입해두세요.

{% if slack_channels %}
| 채널 | 설명 |
|------|------|
{% for channel in slack_channels %}| `#{{ channel }}` | (채널 설명은 채널 내 Topic 확인) |
{% endfor %}
{% else %}
- (채널 정보가 없습니다. config.yaml의 slack.channels를 확인하세요.)
{% endif %}

---

## 5. 팀 구조

> 이 섹션은 자동 생성되지 않습니다. HR 담당자가 직접 업데이트해주세요.

```
[팀 구조 다이어그램 또는 설명 삽입]
```

- **대표**: (이름)
- **팀장**: (이름) — (팀명)
- **팀원**: 입사 후 Slack 디렉토리 또는 Notion 조직도 참고

---

## 6. 첫 2주 체크리스트

### Week 1: 파악하기

- [ ] 이 온보딩 가이드 완독
- [ ] 필독 Notion 문서 전부 읽기
- [ ] Slack 채널 전체 가입 및 최근 메시지 훑어보기
- [ ] 팀원 전체 1:1 인사 (직속 상사 포함)
- [ ] 사용하는 도구 계정 생성 완료
  - [ ] Slack
  - [ ] Notion
  - [ ] GitHub (해당 시)
  - [ ] 기타 업무 도구
- [ ] 회사 정책 및 규정 문서 확인 (연차, 지출결의 등)
- [ ] 업무 환경 세팅 완료 (컴퓨터, 이메일 등)

### Week 2: 참여하기

- [ ] 첫 업무 과제 착수
- [ ] 팀 미팅 참석 및 자기소개
- [ ] 업무 관련 질문 목록 정리 후 담당자에게 확인
- [ ] 업무 프로세스 파악 및 메모
- [ ] 30-60-90일 목표 설정 (직속 상사와 함께)
- [ ] 이 온보딩 가이드 피드백 제공 (HR팀에게)

---

## 7. 자주 묻는 질문 (FAQ)

> 이 섹션은 HR 담당자가 직접 작성해주세요.

**Q. 연차는 어떻게 신청하나요?**
A. (작성 필요)

**Q. 경비 청구는 어떻게 하나요?**
A. (작성 필요)

**Q. 긴급 상황 시 연락처는?**
A. (작성 필요)

---

*이 문서는 {{ generated_at }}에 자동 생성되었습니다.*
*매주 월요일에 최신 데이터로 자동 갱신됩니다.*
