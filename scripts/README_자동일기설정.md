# 🤖 Obsidian 자동 일기 설정 가이드

## 방법 1: 자동 설정 (간단) ⭐ 추천

### 단계 1: PowerShell 관리자 권한으로 열기
1. **Win + X** 키를 누르고 "Windows PowerShell (관리자)" 선택
2. 또는 시작 메뉴 검색에서 "PowerShell" 검색 → 우클릭 → "관리자 권한으로 실행"

### 단계 2: 아래 명령어 복사해서 실행

```powershell
cd "C:\Users\ash\새 폴더\scripts"
.\setup_scheduler.ps1
```

만약 "실행 정책" 오류가 나면:
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```
실행 후 다시 위 명령어 실행

---

## 방법 2: 수동 설정 (더 안전)

### 단계 1: 작업 스케줄러 열기
1. **Win + R** → `taskschd.msc` 입력 → 확인

### 단계 2: 기본 작업 만들기
1. 오른쪽 "작업 만들기" 클릭
2. **일반 탭**:
   - 이름: `Obsidian 자동 일기`
   - 설명: `매일 밤 11시에 자동으로 일기 생성`

### 단계 3: 트리거 설정
1. **트리거 탭** → "새로 만들기"
2. 작업 시작: `일정에 따라`
3. 설정: **매일**
4. 시작 시간: **23:00** (오후 11시)
5. 확인

### 단계 4: 동작 설정
1. **동작 탭** → "새로 만들기"
2. 동작: `프로그램 시작`
3. **프로그램/스크립트**:
   ```
   C:\Users\ash\새 폴더\scripts\run_journal.bat
   ```
4. 확인

### 단계 5: 조건 설정 (선택)
1. **조건 탭**
2. ✅ "컴퓨터의 AC 전원이 켜져 있을 때만 작업 시작" 해제
3. ✅ "배터리 사용 중일 때 중지" 해제

### 단계 6: 완료
- "확인" 클릭
- 작업 목록에서 "Obsidian 자동 일기" 확인

---

## 테스트 방법

### 즉시 실행 테스트
작업 스케줄러에서:
1. "Obsidian 자동 일기" 작업 우클릭
2. "실행" 클릭
3. Obsidian vault의 `일기장/` 폴더 확인

### 수동 실행 (언제든지)
```bash
cd "C:\Users\ash\새 폴더\scripts"
python daily_journal.py
```

---

## 작동 확인

✅ **성공 시**:
- `C:\Users\ash\Documents\안서현 두뇌\일기장\` 폴더에 오늘 날짜 일기 파일 생성
- 파일명 예시: `2026-02-10(화) 일기.md`
- 파일 하단에 "🤖 자동 생성 일기" 섹션 추가

❌ **실패 시**:
- 작업 스케줄러에서 작업 우클릭 → "속성" → "기록" 탭에서 오류 확인
- Python 경로가 올바른지 확인

---

## 문제 해결

### Python을 찾을 수 없음
`run_journal.bat` 파일 수정:
```batch
"C:\Python314\python.exe" "C:\Users\ash\새 폴더\scripts\daily_journal.py"
```

### 일기가 생성되지 않음
1. 수동으로 실행해서 오류 확인:
   ```bash
   python "C:\Users\ash\새 폴더\scripts\daily_journal.py"
   ```
2. Obsidian vault 경로 확인
3. 권한 확인

---

## 스케줄 변경하고 싶으면

작업 스케줄러에서:
1. "Obsidian 자동 일기" 우클릭 → 속성
2. "트리거" 탭 → 시간 수정
3. 확인
