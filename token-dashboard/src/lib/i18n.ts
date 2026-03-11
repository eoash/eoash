export type Locale = "ko" | "en" | "vi";

const translations = {
  // ── Sidebar ──
  "sidebar.title": { ko: "AI Native", en: "AI Native", vi: "AI Native" },
  "sidebar.subtitle": { ko: "EO Studio Dashboard", en: "EO Studio Dashboard", vi: "EO Studio Dashboard" },
  "nav.overview": { ko: "Overview", en: "Overview", vi: "Overview" },
  "nav.leaderboard": { ko: "Leaderboard", en: "Leaderboard", vi: "Leaderboard" },
  "nav.members": { ko: "Members", en: "Members", vi: "Members" },
  "nav.models": { ko: "Models", en: "Models", vi: "Models" },
  "nav.utilization": { ko: "Utilization", en: "Utilization", vi: "Utilization" },
  "nav.efficiency": { ko: "Efficiency", en: "Efficiency", vi: "Efficiency" },
  "nav.rank": { ko: "Rank", en: "Rank", vi: "Rank" },
  "nav.setup": { ko: "설치 가이드", en: "Setup Guide", vi: "Hướng dẫn cài đặt" },

  // ── Common ──
  "common.loading": { ko: "불러오는 중...", en: "Loading...", vi: "Đang tải..." },
  "common.error": { ko: "데이터를 불러오지 못했습니다.", en: "Failed to load data.", vi: "Không thể tải dữ liệu." },
  "common.copy": { ko: "복사", en: "Copy", vi: "Sao chép" },
  "common.copied": { ko: "복사됨!", en: "Copied!", vi: "Đã sao chép!" },

  // ── Announcement badges ──
  "announce.new": { ko: "New", en: "New", vi: "Mới" },
  "announce.update": { ko: "업데이트", en: "Update", vi: "Cập nhật" },
  "announce.info": { ko: "안내", en: "Info", vi: "Thông tin" },
  "announce.warning": { ko: "⚠️ 공사중", en: "⚠️ Maintenance", vi: "⚠️ Bảo trì" },
  "announce.close": { ko: "닫기", en: "Close", vi: "Đóng" },
  "announce.maintenance": {
    ko: "토큰 사용량 집계에 특정일 스파이크가 감지되어 데이터 보정 작업 중입니다. 일부 수치가 부정확할 수 있습니다.",
    en: "Spike detected in token usage data. Data correction in progress — some numbers may be inaccurate.",
    vi: "Phát hiện đột biến trong dữ liệu token. Đang hiệu chỉnh — một số con số có thể chưa chính xác.",
  },
  "announce.spikeResolved": {
    ko: "토큰 사용량 스파이크 이슈가 해결되었습니다. 현재 전 팀원 데이터가 정상 집계됩니다.",
    en: "Token usage spike issue has been resolved. All team members' data is now accurate.",
    vi: "Sự cố đột biến token đã được khắc phục. Dữ liệu của tất cả thành viên hiện đã chính xác.",
  },
  "announce.spikeResolvedLink": { ko: "자세히 보기 →", en: "Details →", vi: "Chi tiết →" },
  "announce.setup": {
    ko: "아직 설치 전이라면 터미널에서 한 줄이면 완료!",
    en: "Not installed yet? Just one command in your terminal!",
    vi: "Chưa cài đặt? Chỉ cần một lệnh trong terminal!",
  },
  "announce.setupLink": { ko: "설치 가이드 →", en: "Setup Guide →", vi: "Hướng dẫn cài đặt →" },

  // ── Overview KPI ──
  "kpi.totalTokens": { ko: "전체 토큰", en: "Total Tokens", vi: "Tổng Token" },
  "kpi.totalTokens.sub": { ko: "입력 + 출력 (캐시 제외)", en: "input + output (excl. cache)", vi: "input + output (không tính cache)" },
  "kpi.totalTokens.tip": {
    ko: "입력·출력 토큰 합계 (캐시 제외). 팀 전체가 Claude에게 보내고 받은 실제 텍스트 양입니다.",
    en: "Total input + output tokens (excluding cache). The actual volume of text the team sent to and received from Claude.",
    vi: "Tổng token input + output (không tính cache). Lượng văn bản thực tế mà team đã gửi và nhận từ Claude.",
  },
  "kpi.cacheHitRate": { ko: "캐시 적중률", en: "Cache Hit Rate", vi: "Tỷ lệ Cache Hit" },
  "kpi.cacheHitRate.sub": { ko: "캐시 재활용 효율", en: "cache reuse efficiency", vi: "hiệu suất tái sử dụng cache" },
  "kpi.cacheHitRate.tip": {
    ko: "캐시된 프롬프트를 재활용한 비율. 높을수록 동일 컨텍스트 재전송이 줄어 응답이 빨라지고 비용 효율이 올라갑니다.",
    en: "Ratio of cached prompts reused. Higher means less redundant context, faster responses, and better cost efficiency.",
    vi: "Tỷ lệ tái sử dụng prompt đã cache. Càng cao nghĩa là ít gửi lại context, phản hồi nhanh hơn và tiết kiệm chi phí hơn.",
  },
  "kpi.activeUsers": { ko: "활성 사용자", en: "Active Users", vi: "Người dùng hoạt động" },
  "kpi.activeUsers.sub": { ko: "고유 팀원 수", en: "unique team members", vi: "số thành viên" },
  "kpi.activeUsers.tip": {
    ko: "선택 기간 중 Claude를 1회 이상 사용한 팀원 수입니다.",
    en: "Number of team members who used Claude at least once in the selected period.",
    vi: "Số thành viên đã sử dụng Claude ít nhất 1 lần trong khoảng thời gian đã chọn.",
  },
  "kpi.avgDailySessions": { ko: "일 평균 세션", en: "Avg Daily Sessions", vi: "Phiên TB/ngày" },
  "kpi.avgDailySessions.sub": { ko: "하루 세션 수", en: "sessions per day", vi: "phiên mỗi ngày" },
  "kpi.avgDailySessions.tip": {
    ko: "하루 평균 Claude 세션 수입니다.",
    en: "Average number of Claude sessions per day.",
    vi: "Số phiên Claude trung bình mỗi ngày.",
  },
  "kpi.totalCommits": { ko: "전체 커밋", en: "Total Commits", vi: "Tổng Commit" },
  "kpi.totalCommits.sub": { ko: "기간 내 커밋 수", en: "commits in period", vi: "commit trong kỳ" },
  "kpi.totalCommits.tip": {
    ko: "Claude 세션에서 발생한 Git 커밋 수입니다.",
    en: "Number of Git commits made during Claude sessions.",
    vi: "Số Git commit được tạo trong phiên Claude.",
  },
  "kpi.pullRequests": { ko: "Pull Requests", en: "Pull Requests", vi: "Pull Requests" },
  "kpi.pullRequests.sub": { ko: "생성된 PR 수", en: "PRs created", vi: "PR đã tạo" },
  "kpi.pullRequests.tip": {
    ko: "Claude 세션에서 생성된 PR 수입니다.",
    en: "Number of PRs created during Claude sessions.",
    vi: "Số PR được tạo trong phiên Claude.",
  },

  // ── Charts ──
  "chart.dailyUsage": { ko: "일별 토큰 사용량", en: "Daily Token Usage", vi: "Token sử dụng theo ngày" },
  "chart.cacheRead": { ko: "캐시 읽기", en: "Cache Read", vi: "Cache Read" },
  "chart.output": { ko: "출력", en: "Output", vi: "Output" },
  "chart.input": { ko: "입력", en: "Input", vi: "Input" },
  "chart.modelDist": { ko: "모델 분포", en: "Model Distribution", vi: "Phân bố Model" },
  "chart.totalTokens": { ko: "전체 토큰", en: "total tokens", vi: "tổng token" },

  // ── Weekly Champions ──
  "weekly.title": { ko: "주간 챔피언", en: "Weekly Champions", vi: "Nhà vô địch tuần" },

  // ── Leaderboard ──
  "lb.developer": { ko: "개발자", en: "DEVELOPER", vi: "LẬP TRÌNH VIÊN" },
  "lb.total": { ko: "합계", en: "TOTAL", vi: "TỔNG" },
  "lb.cacheHit": { ko: "캐시 적중", en: "CACHE HIT", vi: "CACHE HIT" },
  "lb.teamAvg": { ko: "팀 평균", en: "TEAM AVG", vi: "TB TEAM" },
  "lb.members": { ko: "명", en: " members", vi: " thành viên" },
  "lb.autoRefresh": { ko: "자동 새로고침: 30초", en: "Auto-refresh: 30s", vi: "Tự động làm mới: 30s" },
  "lb.noDataCodex": { ko: "Codex 사용 데이터가 없습니다", en: "No Codex usage data available", vi: "Không có dữ liệu sử dụng Codex" },
  "lb.codexNote": { ko: "Codex는 캐시에서 재사용한 토큰도 input에 포함하여 집계합니다. Claude는 이를 별도(Cache Read)로 분리하기 때문에, 같은 작업이라도 Codex의 input이 더 높게 표시됩니다.", en: "Codex counts cached (reused) tokens as part of input, while Claude separates them into Cache Read. This makes Codex input appear higher for the same workload.", vi: "Codex tính token cache (tái sử dụng) vào input, trong khi Claude tách riêng thành Cache Read. Vì vậy input của Codex sẽ hiển thị cao hơn cho cùng khối lượng công việc." },
  "lb.noDataGemini": { ko: "Gemini CLI 사용 데이터가 없습니다", en: "No Gemini CLI usage data available", vi: "Không có dữ liệu sử dụng Gemini CLI" },
  "lb.input.tip": {
    ko: "Claude에게 보낸 프롬프트·코드·컨텍스트의 토큰 수. 캐시된 부분은 제외한 순수 입력입니다.",
    en: "Tokens sent to Claude as prompts, code, and context. Excludes cached portions.",
    vi: "Số token gửi đến Claude dưới dạng prompt, code và context. Không tính phần đã cache.",
  },
  "lb.output.tip": {
    ko: "Claude가 생성한 응답·코드의 토큰 수. 많을수록 코드 생성 작업을 많이 한 것입니다.",
    en: "Tokens generated by Claude as responses and code. Higher means more code generation.",
    vi: "Số token Claude tạo ra dưới dạng phản hồi và code. Càng nhiều nghĩa là tạo code càng nhiều.",
  },
  "lb.cacheRead.tip": {
    ko: "이전에 보낸 컨텍스트를 캐시에서 재활용한 토큰 수. CLAUDE.md, 스킬 등 반복 컨텍스트가 여기에 해당합니다.",
    en: "Tokens reused from cache instead of resending. Includes CLAUDE.md, skills, and repeated context.",
    vi: "Số token tái sử dụng từ cache thay vì gửi lại. Bao gồm CLAUDE.md, skills và context lặp lại.",
  },
  "lb.total.tip": {
    ko: "입력 + 출력 합산 토큰 사용량입니다 (캐시 제외).",
    en: "Total token usage: input + output combined (excluding cache).",
    vi: "Tổng token sử dụng: input + output (không tính cache).",
  },
  "lb.cacheHit.tip": {
    ko: "캐시 재활용 비율. 높을수록 동일 컨텍스트를 효율적으로 재사용하고 있다는 뜻입니다.",
    en: "Cache reuse ratio. Higher means more efficient reuse of context.",
    vi: "Tỷ lệ tái sử dụng cache. Càng cao nghĩa là tái sử dụng context càng hiệu quả.",
  },
  "lb.cached.tip": {
    ko: "Codex가 캐시에서 재사용한 토큰 수. Codex는 이를 input에 포함하여 집계합니다.",
    en: "Tokens reused from cache by Codex. Codex includes these in input counts.",
    vi: "Số token Codex tái sử dụng từ cache. Codex tính vào input.",
  },
  "lb.reasoning.tip": {
    ko: "Codex가 응답 전 내부적으로 수행한 추론(thinking) 토큰 수입니다.",
    en: "Reasoning (thinking) tokens used by Codex before generating a response.",
    vi: "Số token suy luận (thinking) Codex sử dụng trước khi tạo phản hồi.",
  },
  "lb.geminiCache.tip": {
    ko: "Gemini가 캐시에서 재사용한 토큰 수입니다.",
    en: "Tokens reused from cache by Gemini.",
    vi: "Số token Gemini tái sử dụng từ cache.",
  },
  "lb.thought.tip": {
    ko: "Gemini가 응답 전 내부적으로 수행한 사고(thinking) 토큰 수입니다.",
    en: "Thinking tokens used by Gemini before generating a response.",
    vi: "Số token suy nghĩ (thinking) Gemini sử dụng trước khi tạo phản hồi.",
  },
  "lb.mockMode": {
    ko: "샘플 데이터로 표시 중 — PROMETHEUS_URL 설정 후 실제 데이터를 확인하세요",
    en: "Showing sample data — Set PROMETHEUS_URL to see real data",
    vi: "Đang hiển thị dữ liệu mẫu — Cài đặt PROMETHEUS_URL để xem dữ liệu thực",
  },

  // ── Team page ──
  "team.allMembers": { ko: "전체 팀원", en: "All Members", vi: "Tất cả thành viên" },
  "team.tokens.tip": {
    ko: "이 팀원이 사용한 전체 토큰(입력+출력+캐시) 합계입니다.",
    en: "Total tokens (input + output + cache) used by this member.",
    vi: "Tổng token (input + output + cache) thành viên này đã sử dụng.",
  },
  "team.cacheHit.tip": {
    ko: "이 팀원의 캐시 재활용 비율. 높을수록 동일 컨텍스트 재전송이 줄어 효율적입니다.",
    en: "Cache reuse ratio for this member. Higher means less redundant context and better efficiency.",
    vi: "Tỷ lệ tái sử dụng cache của thành viên. Càng cao nghĩa là ít context thừa và hiệu quả hơn.",
  },
  "team.sessions": { ko: "세션", en: "Sessions", vi: "Phiên" },
  "team.sessions.tip": {
    ko: "이 팀원의 Claude Code 세션 수입니다.",
    en: "Number of Claude Code sessions for this member.",
    vi: "Số phiên Claude Code của thành viên này.",
  },
  "team.commits.tip": {
    ko: "이 팀원의 Claude 세션에서 발생한 Git 커밋 수입니다.",
    en: "Number of Git commits from this member's Claude sessions.",
    vi: "Số Git commit từ phiên Claude của thành viên này.",
  },
  "team.prs.tip": {
    ko: "이 팀원이 Claude 세션에서 생성한 PR 수입니다.",
    en: "Number of PRs created during this member's Claude sessions.",
    vi: "Số PR được tạo trong phiên Claude của thành viên này.",
  },

  // ── Models page ──
  "models.breakdown": { ko: "토큰 상세", en: "Token Breakdown", vi: "Chi tiết Token" },
  "models.model": { ko: "모델", en: "Model", vi: "Model" },

  // ── Utilization page ──
  "util.byMember": { ko: "팀원별 토큰 사용량", en: "Tokens by Team Member", vi: "Token theo thành viên" },
  "util.avgDailyTokens": { ko: "일 평균 토큰", en: "Avg Daily Tokens", vi: "Token TB/ngày" },
  "util.avgDailyTokens.sub": { ko: "하루 토큰 수", en: "tokens per day", vi: "token mỗi ngày" },
  "util.avgDailyTokens.tip": {
    ko: "일 평균 토큰 사용량. 전체 토큰을 활성 일수로 나눈 값입니다.",
    en: "Average daily token usage. Total tokens divided by active days.",
    vi: "Lượng token trung bình mỗi ngày. Tổng token chia cho số ngày hoạt động.",
  },

  // ── Efficiency page ──
  "eff.dailyCacheHit": { ko: "일별 캐시 적중률", en: "Daily Cache Hit Rate", vi: "Tỷ lệ Cache Hit theo ngày" },
  "eff.dailyCacheHit.tip": {
    ko: "팀 전체의 일별 캐시 재활용률 추이. 꾸준히 높으면 프롬프트와 컨텍스트 설계가 안정적이라는 뜻입니다.",
    en: "Daily cache reuse rate trend. Consistently high means stable prompt and context design.",
    vi: "Xu hướng tỷ lệ tái sử dụng cache hàng ngày. Luôn cao nghĩa là thiết kế prompt và context ổn định.",
  },
  "eff.memberComparison": { ko: "팀원별 효율 비교", en: "Member Efficiency Comparison", vi: "So sánh hiệu suất thành viên" },
  "eff.cacheHitByMember": { ko: "팀원별 캐시 적중률", en: "Cache Hit Rate by Member", vi: "Tỷ lệ Cache Hit theo thành viên" },
  "eff.cacheHitByMember.tip": {
    ko: "팀원별 캐시 재활용률 비교. CLAUDE.md, 스킬 등 컨텍스트를 잘 설계한 사람일수록 높게 나옵니다.",
    en: "Cache reuse rate by member. Members with well-designed CLAUDE.md and skills score higher.",
    vi: "Tỷ lệ tái sử dụng cache theo thành viên. Người thiết kế CLAUDE.md và skills tốt sẽ có điểm cao hơn.",
  },
  "eff.outputRatioByMember": { ko: "팀원별 출력 비율", en: "Output Ratio by Member", vi: "Tỷ lệ Output theo thành viên" },
  "eff.outputRatioByMember.tip": {
    ko: "팀원별 출력/입력 토큰 비율. 코드 생성 작업이 많으면 높고, 탐색·리뷰 위주면 낮습니다. 역할에 따라 다르므로 높낮이가 좋고 나쁨을 의미하지 않습니다.",
    en: "Output/input token ratio by member. Higher for code generation, lower for exploration. Neither is inherently better — it depends on the role.",
    vi: "Tỷ lệ token output/input theo thành viên. Cao hơn khi tạo code nhiều, thấp hơn khi khám phá/review. Không có mức nào tốt hơn — tùy thuộc vai trò.",
  },
  "eff.breakdown": { ko: "효율성 상세", en: "Efficiency Breakdown", vi: "Chi tiết hiệu suất" },
  "eff.breakdown.tip": {
    ko: "팀원별 효율성 지표 상세 테이블. 각 컬럼 헤더에 마우스를 올리면 설명을 볼 수 있습니다.",
    en: "Detailed efficiency metrics by member. Hover over column headers for descriptions.",
    vi: "Bảng chi tiết chỉ số hiệu suất theo thành viên. Di chuột vào tiêu đề cột để xem mô tả.",
  },
  "eff.outputRatio": { ko: "출력 비율", en: "Output Ratio", vi: "Tỷ lệ Output" },
  "eff.outputRatio.sub": { ko: "출력 / 입력", en: "output / input", vi: "output / input" },
  "eff.outputRatio.tip": {
    ko: "입력 토큰 대비 출력 토큰 비율. 높을수록 적은 프롬프트로 많은 결과를 얻고 있다는 뜻입니다.",
    en: "Output to input token ratio. Higher means more output from fewer prompts.",
    vi: "Tỷ lệ token output so với input. Càng cao nghĩa là nhận nhiều kết quả hơn từ ít prompt hơn.",
  },
  "eff.cacheEff": { ko: "캐시 효율", en: "Cache Efficiency", vi: "Hiệu suất Cache" },
  "eff.cacheEff.sub": { ko: "캐시 읽기 / 생성", en: "cache read / creation", vi: "cache read / creation" },
  "eff.cacheEff.tip": {
    ko: "캐시 생성 대비 재사용 배수. 1x = 만든 만큼만 씀, 10x = 한번 만들어 10번 재활용. 높을수록 컨텍스트 설계가 잘 되어 있다는 뜻입니다.",
    en: "Cache reuse multiplier. 1x = used as much as created, 10x = created once, reused 10 times. Higher means better context design.",
    vi: "Hệ số tái sử dụng cache. 1x = dùng bằng lượng tạo, 10x = tạo 1 lần dùng 10 lần. Càng cao nghĩa là thiết kế context càng tốt.",
  },
  "eff.member": { ko: "팀원", en: "Member", vi: "Thành viên" },
  "eff.totalTokens.tip": {
    ko: "input + output 합계 (cache 제외)",
    en: "Sum of input + output (excluding cache)",
    vi: "Tổng input + output (không tính cache)",
  },
  "eff.cacheHit.tip": {
    ko: "cache_read / (cache_read + cache_creation + input). 높을수록 좋음",
    en: "cache_read / (cache_read + cache_creation + input). Higher is better",
    vi: "cache_read / (cache_read + cache_creation + input). Càng cao càng tốt",
  },
  "eff.outputRatioCol.tip": {
    ko: "output / input 비율. 역할에 따라 다름",
    en: "output / input ratio. Varies by role",
    vi: "Tỷ lệ output / input. Khác nhau theo vai trò",
  },
  "eff.cacheEffCol.tip": {
    ko: "cache_read / cache_creation. 캐시를 얼마나 재활용하는지",
    en: "cache_read / cache_creation. How much cache is reused",
    vi: "cache_read / cache_creation. Cache được tái sử dụng bao nhiêu",
  },
  "eff.reasoningRatio": { ko: "추론 비율", en: "Reasoning Ratio", vi: "Tỷ lệ Suy luận" },
  "eff.reasoningRatio.sub": { ko: "추론 / 출력", en: "reasoning / output", vi: "reasoning / output" },
  "eff.reasoningRatio.tip": {
    ko: "출력 토큰 중 추론(thinking) 비중. Codex는 응답 전 내부 추론을 수행하며, 이 비율이 높으면 더 깊이 사고한 후 답변한 것입니다.",
    en: "Proportion of reasoning (thinking) tokens in output. Higher means more deliberation before responding.",
    vi: "Tỷ lệ token suy luận (thinking) trong output. Càng cao nghĩa là suy nghĩ kỹ hơn trước khi trả lời.",
  },
  "eff.codexNote": {
    ko: "Codex는 캐시 구조가 Claude와 다릅니다. Cache Efficiency(생성 대비 재사용) 대신 Reasoning Ratio(추론 토큰 비율)를 표시합니다.",
    en: "Codex has a different caching model than Claude. Reasoning Ratio is shown instead of Cache Efficiency.",
    vi: "Codex có cơ chế cache khác Claude. Hiển thị Reasoning Ratio thay vì Cache Efficiency.",
  },
  "eff.noDaily": {
    ko: "일별 추이 데이터가 부족합니다",
    en: "Not enough daily trend data",
    vi: "Không đủ dữ liệu xu hướng hàng ngày",
  },
  "eff.activeUsers": { ko: "사용자 수", en: "Active Users", vi: "Số người dùng" },
  "eff.activeUsers.sub": { ko: "도구 사용 팀원", en: "tool users", vi: "người dùng công cụ" },

  // ── Setup page ──
  "setup.title": { ko: "설치 가이드", en: "Setup Guide", vi: "Hướng dẫn cài đặt" },
  "setup.desc": {
    ko: "터미널에서 아래 명령어 한 줄이면 설치 완료! Claude Code · Codex · Gemini 사용량이 자동으로 대시보드에 수집됩니다.",
    en: "Just one command in your terminal! Claude Code, Codex, and Gemini usage will be automatically collected to the dashboard.",
    vi: "Chỉ cần một lệnh trong terminal! Dữ liệu sử dụng Claude Code, Codex và Gemini sẽ được tự động thu thập vào dashboard.",
  },
  "setup.installCmd": { ko: "설치 명령어", en: "Install Command", vi: "Lệnh cài đặt" },
  "setup.prereq": { ko: "사전 요구사항", en: "Prerequisites", vi: "Yêu cầu trước" },
  "setup.whatInstalled": { ko: "설치 항목", en: "What Gets Installed", vi: "Những gì được cài đặt" },
  "setup.step1": { ko: "Claude Code Stop Hook", en: "Claude Code Stop Hook", vi: "Claude Code Stop Hook" },
  "setup.step1.desc": {
    ko: "세션 종료 시 토큰 사용량을 자동 전송합니다.",
    en: "Automatically sends token usage when a session ends.",
    vi: "Tự động gửi dữ liệu token khi phiên kết thúc.",
  },
  "setup.step2": { ko: "과거 데이터 Backfill", en: "Historical Data Backfill", vi: "Backfill dữ liệu lịch sử" },
  "setup.step2.desc": {
    ko: "기존 transcript에서 과거 사용량을 추출해 대시보드에 반영합니다.",
    en: "Extracts past usage from existing transcripts and sends to the dashboard.",
    vi: "Trích xuất dữ liệu sử dụng trước đó từ transcript và gửi lên dashboard.",
  },
  "setup.step3": { ko: "Codex CLI 수집", en: "Codex CLI Collection", vi: "Thu thập Codex CLI" },
  "setup.step3.desc": {
    ko: "Codex 세션 로그를 수집하고, 2시간마다 자동 전송하는 cron을 등록합니다.",
    en: "Collects Codex session logs and registers a cron job for auto-collection every 2 hours.",
    vi: "Thu thập log phiên Codex và đăng ký cron job tự động thu thập mỗi 2 giờ.",
  },
  "setup.step4": { ko: "Gemini CLI 텔레메트리", en: "Gemini CLI Telemetry", vi: "Gemini CLI Telemetry" },
  "setup.step4.desc": {
    ko: "Gemini 네이티브 OTel을 활성화해 실시간으로 사용량을 전송합니다.",
    en: "Enables Gemini native OTel for real-time usage transmission.",
    vi: "Bật OTel gốc của Gemini để gửi dữ liệu sử dụng theo thời gian thực.",
  },
  "setup.afterInstall": { ko: "설치 후 동작", en: "After Installation", vi: "Sau khi cài đặt" },
  "setup.claude.after": {
    ko: "세션 종료 시 자동 수집 (Stop hook)",
    en: "Auto-collected on session end (Stop hook)",
    vi: "Tự động thu thập khi kết thúc phiên (Stop hook)",
  },
  "setup.codex.after": {
    ko: "2시간마다 자동 수집 (cron)",
    en: "Auto-collected every 2 hours (cron)",
    vi: "Tự động thu thập mỗi 2 giờ (cron)",
  },
  "setup.gemini.after": {
    ko: "세션 중 실시간 전송 (네이티브 OTel)",
    en: "Real-time during sessions (native OTel)",
    vi: "Gửi theo thời gian thực trong phiên (OTel gốc)",
  },
  "setup.troubleshooting": { ko: "문제 해결", en: "Troubleshooting", vi: "Xử lý sự cố" },
  "setup.trouble1.title": {
    ko: "git email이 @eoeoeo.net이 아닌 경우",
    en: "git email is not @eoeoeo.net",
    vi: "Email git không phải @eoeoeo.net",
  },
  "setup.trouble1.desc": {
    ko: "설치 스크립트가 자동으로 물어봅니다. 본인 이메일 아이디만 입력하세요.",
    en: "The install script will prompt you. Just enter your email ID.",
    vi: "Script cài đặt sẽ tự động hỏi. Chỉ cần nhập email ID của bạn.",
  },
  "setup.trouble2.title": {
    ko: "이미 설치했는데 데이터가 안 보이는 경우",
    en: "Already installed but data not showing",
    vi: "Đã cài đặt nhưng không thấy dữ liệu",
  },
  "setup.trouble2.desc": {
    ko: "Claude Code 세션을 한 번 종료해보세요. Stop hook이 실행되면서 데이터가 전송됩니다.",
    en: "Try ending a Claude Code session. The Stop hook will send the data.",
    vi: "Thử kết thúc một phiên Claude Code. Stop hook sẽ gửi dữ liệu.",
  },
  "setup.trouble3.title": {
    ko: "업데이트가 필요한 경우",
    en: "Need to update",
    vi: "Cần cập nhật",
  },
  "setup.trouble3.desc": {
    ko: "같은 명령어를 다시 실행하면 자동으로 최신 버전으로 업데이트됩니다.",
    en: "Run the same command again to auto-update to the latest version.",
    vi: "Chạy lại lệnh tương tự để tự động cập nhật lên phiên bản mới nhất.",
  },

  // ── DateRangePicker ──
  "date.today": { ko: "오늘", en: "Today", vi: "Hôm nay" },
  "date.7d": { ko: "7일", en: "7D", vi: "7N" },
  "date.30d": { ko: "30일", en: "30D", vi: "30N" },
  "date.all": { ko: "전체", en: "All", vi: "Tất cả" },

  // ── Leaderboard periods ──
  "period.today": { ko: "오늘", en: "Today", vi: "Hôm nay" },
  "period.7days": { ko: "7일", en: "7 Days", vi: "7 Ngày" },
  "period.30days": { ko: "30일", en: "30 Days", vi: "30 Ngày" },
  "period.allTime": { ko: "전체", en: "All Time", vi: "Tất cả" },

  // ── Board ──
  "nav.board": { ko: "Board", en: "Board", vi: "Board" },
  "board.title": { ko: "게시판", en: "Board", vi: "Bảng tin" },
  "board.latest": { ko: "최신 글", en: "Latest Posts", vi: "Bài viết mới" },
  "board.more": { ko: "더보기 →", en: "See more →", vi: "Xem thêm →" },
  "board.all": { ko: "전체", en: "All", vi: "Tất cả" },
  "board.notice": { ko: "공지", en: "Notice", vi: "Thông báo" },
  "board.product": { ko: "프로덕트", en: "Product", vi: "Sản phẩm" },
  "board.pinned": { ko: "고정", en: "Pinned", vi: "Ghim" },
  "board.empty": { ko: "아직 게시글이 없습니다", en: "No posts yet", vi: "Chưa có bài viết nào" },
  "board.write": { ko: "글쓰기", en: "Write", vi: "Viết bài" },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, locale: Locale): string {
  return translations[key][locale];
}
