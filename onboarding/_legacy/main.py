"""
main.py
역할: 신규 입사자 온보딩 시스템의 전체 파이프라인 오케스트레이터.
      설정 로드 → 데이터 수집 → 분석 → 가이드 생성 → 알림 발송 순서로 실행한다.

사용법:
    python main.py                          # 전체 파이프라인 실행
    python main.py --collect-only           # 수집 단계만 실행
    python main.py --analyze-only           # 분석 단계만 실행 (기존 raw 데이터 사용)
    python main.py --dry-run                # Notion 업로드 및 Slack 알림 생략
    python main.py --config PATH            # config.yaml 경로 직접 지정
"""

import argparse
import json
import logging
import sys
import time
from datetime import datetime
from pathlib import Path

# 패키지 루트를 sys.path에 추가 (직접 실행 지원)
sys.path.insert(0, str(Path(__file__).parent))

from src.config_loader import ConfigLoader, ConfigError
from src.collectors.slack_collector import SlackCollector
from src.collectors.notion_collector import NotionCollector
from src.analyzers.keyword_analyzer import KeywordAnalyzer
from src.analyzers.notice_analyzer import NoticeAnalyzer
from src.outputs.guide_generator import GuideGenerator
from src.outputs.report_generator import ReportGenerator
from src.outputs.notion_uploader import NotionUploader
from src.notifiers.slack_notifier import SlackNotifier


def setup_logging(log_dir: Path, today_str: str) -> None:
    """
    로깅 설정: 콘솔 출력과 파일 저장을 동시에 처리한다.

    Args:
        log_dir: 로그 파일 저장 디렉토리
        today_str: 오늘 날짜 문자열 (YYYYMMDD)
    """
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / f"run_{today_str}.log"

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[
            logging.FileHandler(log_file, encoding="utf-8"),
            logging.StreamHandler(sys.stdout),
        ],
    )


def parse_args() -> argparse.Namespace:
    """CLI 인수를 파싱한다."""
    parser = argparse.ArgumentParser(
        description="신규 입사자 온보딩 가이드 자동 생성 시스템",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
실행 예시:
  python main.py                  전체 파이프라인 실행
  python main.py --collect-only   수집 단계만 실행 (분석/생성 생략)
  python main.py --analyze-only   분석 단계만 실행 (기존 raw 데이터 사용)
  python main.py --dry-run        Notion 업로드 및 Slack 알림 없이 로컬 파일만 생성
  python main.py --config custom/config.yaml  커스텀 설정 파일 사용
        """,
    )
    parser.add_argument(
        "--collect-only",
        action="store_true",
        help="수집 단계만 실행 (분석, 가이드 생성 생략)",
    )
    parser.add_argument(
        "--analyze-only",
        action="store_true",
        help="분석 단계만 실행 (기존 data/raw/ 데이터 사용)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Notion 업로드 및 Slack 알림 생략, 로컬 파일만 생성",
    )
    parser.add_argument(
        "--config",
        type=str,
        default=None,
        help="config.yaml 경로 지정 (기본값: ./config/config.yaml)",
    )
    return parser.parse_args()


def run_collect(config: ConfigLoader, base_dir: Path) -> tuple[dict, list]:
    """
    수집 단계: Slack과 Notion에서 데이터를 수집한다.

    Args:
        config: 설정 객체
        base_dir: onboarding/ 루트 디렉토리

    Returns:
        (slack_data, notion_data) 튜플
        slack_data: {채널명: [메시지 목록]}
        notion_data: [페이지 데이터 목록]
    """
    logger = logging.getLogger("collect")

    raw_data_path = base_dir / config.get("paths.raw_data", "data/raw")

    # Slack 수집
    logger.info("=== Slack 데이터 수집 시작 ===")
    slack_data: dict = {}
    try:
        slack_collector = SlackCollector(
            token=config.slack_token,
            channels=config.slack_channels,
            days=config.slack_collect_days,
            output_dir=str(raw_data_path / "slack"),
            rate_limit_delay=config.slack_rate_limit_delay,
        )
        slack_data = slack_collector.run()
        total_messages = sum(len(v) for v in slack_data.values())
        logger.info(f"Slack 수집 완료: {total_messages}건")
    except ConfigError as e:
        logger.warning(f"Slack 수집 건너뜀 (설정 오류): {e}")
    except Exception as e:
        logger.error(f"Slack 수집 실패: {e}")

    # Notion 수집
    logger.info("=== Notion 데이터 수집 시작 ===")
    notion_data: list = []
    try:
        notion_collector = NotionCollector(
            token=config.notion_api_key,
            page_ids=config.notion_page_ids,
            output_dir=str(raw_data_path / "notion"),
        )
        notion_data = notion_collector.run()
        logger.info(f"Notion 수집 완료: {len(notion_data)}건")
    except ConfigError as e:
        logger.warning(f"Notion 수집 건너뜀 (설정 오류): {e}")
    except Exception as e:
        logger.error(f"Notion 수집 실패: {e}")

    return slack_data, notion_data


def run_analyze(
    config: ConfigLoader,
    base_dir: Path,
    slack_data: dict,
    notion_data: list,
) -> dict:
    """
    분석 단계: 수집 데이터에서 키워드, 공지사항, 필독 문서를 추출한다.

    Args:
        config: 설정 객체
        base_dir: onboarding/ 루트 디렉토리
        slack_data: 수집된 Slack 데이터
        notion_data: 수집된 Notion 데이터

    Returns:
        전체 분석 결과 딕셔너리
    """
    logger = logging.getLogger("analyze")
    raw_data_path = base_dir / config.get("paths.raw_data", "data/raw")

    logger.info("=== 데이터 분석 시작 ===")

    # 키워드 분석
    logger.info("키워드 분석 중...")
    keyword_analyzer = KeywordAnalyzer(
        raw_data_dir=str(raw_data_path),
        stopwords=config.stopwords,
    )

    if slack_data or notion_data:
        # 메모리 내 데이터로 분석
        keywords = keyword_analyzer.analyze_from_data(
            slack_data=slack_data,
            notion_data=notion_data,
            top_n=config.keyword_top_n,
        )
    else:
        # 기존 파일에서 분석 (--analyze-only 모드)
        keywords = keyword_analyzer.extract_keywords(top_n=config.keyword_top_n)

    logger.info(f"키워드 분석 완료: {len(keywords)}개")

    # 공지사항 및 필독 문서 분석
    logger.info("공지사항 및 필독 문서 분석 중...")
    notice_analyzer = NoticeAnalyzer(raw_data_dir=str(raw_data_path))

    if slack_data or notion_data:
        notice_result = notice_analyzer.analyze_from_data(
            slack_data=slack_data,
            notion_data=notion_data,
            notice_count=config.announcement_count,
            must_read_count=config.must_read_count,
        )
    else:
        notices = notice_analyzer.extract_notices(count=config.announcement_count)
        must_read_pages = notice_analyzer.extract_must_read_pages(count=config.must_read_count)
        notice_result = {"notices": notices, "must_read_pages": must_read_pages}

    logger.info(f"공지사항 추출: {len(notice_result['notices'])}건")
    logger.info(f"필독 문서 선정: {len(notice_result['must_read_pages'])}건")

    # 채널 ID → 채널명 변환
    channel_names = config.slack_channel_names
    display_channels = [channel_names.get(ch, ch) for ch in config.slack_channels]

    # 공지사항의 channel 필드도 채널명으로 변환
    for notice in notice_result["notices"]:
        ch_id = notice.get("channel", "")
        notice["channel"] = channel_names.get(ch_id, ch_id)

    # 분석 결과 통합
    total_slack_messages = sum(len(v) for v in slack_data.values()) if slack_data else 0
    analysis = {
        "generated_at": datetime.now().strftime("%Y-%m-%d"),
        "workspace_name": config.notion_workspace_name,
        "keywords": keywords,
        "notices": notice_result["notices"],
        "must_read_pages": notice_result["must_read_pages"],
        "slack_channels": display_channels,
        "stats": {
            "slack_messages_count": total_slack_messages,
            "notion_pages_count": len(notion_data),
            "keywords_extracted": len(keywords),
            "notices_extracted": len(notice_result["notices"]),
            "must_read_pages_count": len(notice_result["must_read_pages"]),
        }
    }

    return analysis


def run_generate(config: ConfigLoader, base_dir: Path, analysis: dict) -> tuple[str, str]:
    """
    생성 단계: 분석 결과를 바탕으로 온보딩 가이드와 요약 리포트를 생성한다.

    Args:
        config: 설정 객체
        base_dir: onboarding/ 루트 디렉토리
        analysis: 분석 결과 딕셔너리

    Returns:
        (guide_path, report_path) 생성된 파일 경로 튜플
    """
    logger = logging.getLogger("generate")
    output_path = base_dir / config.get("paths.output", "output")
    template_path = base_dir / config.get("paths.templates", "templates") / "onboarding_guide_template.md"

    logger.info("=== 가이드 및 리포트 생성 시작 ===")

    # 온보딩 가이드 생성
    guide_output_path = str(base_dir / config.get("output.guide_path", "output/ONBOARDING_GUIDE.md"))
    guide_path = ""

    try:
        generator = GuideGenerator(
            analysis=analysis,
            template_path=str(template_path),
            output_path=guide_output_path,
        )
        guide_path = generator.generate()
        logger.info(f"온보딩 가이드 생성 완료: {guide_path}")

    except Exception as e:
        logger.error(f"가이드 생성 실패: {e}")

    # 요약 리포트 생성
    report_path = ""
    try:
        report_generator = ReportGenerator(
            analysis=analysis,
            output_dir=str(output_path),
        )
        report_path = report_generator.generate()

        # 분석 결과 JSON 저장
        analyzed_dir = base_dir / config.get("paths.analyzed_data", "data/analyzed")
        report_generator.save_analysis_json(str(analyzed_dir))

        logger.info(f"요약 리포트 생성 완료: {report_path}")

    except Exception as e:
        logger.error(f"요약 리포트 생성 실패: {e}")

    return guide_path, report_path


def run_notify(
    config: ConfigLoader,
    analysis: dict,
    guide_path: str,
    notion_guide_url: str,
    start_time: float,
    dry_run: bool,
) -> None:
    """
    알림 단계: Slack #hr-ops 채널에 완료 알림을 발송한다.

    Args:
        config: 설정 객체
        analysis: 분석 결과 딕셔너리
        guide_path: 생성된 가이드 파일 경로
        notion_guide_url: Notion 업로드된 가이드 URL (없으면 빈 문자열)
        start_time: 파이프라인 시작 시간 (time.time() 기준)
        dry_run: True이면 알림 발송 생략
    """
    logger = logging.getLogger("notify")

    if dry_run:
        logger.info("--dry-run 모드: Slack 알림 발송 생략")
        return

    logger.info("=== Slack 완료 알림 발송 ===")

    try:
        notifier = SlackNotifier(
            token=config.slack_token,
            channel=config.slack_notify_channel,
        )

        stats = {
            **analysis.get("stats", {}),
            "generated_at": analysis.get("generated_at", ""),
            "guide_path": guide_path,
            "notion_guide_url": notion_guide_url,
            "duration_seconds": int(time.time() - start_time),
        }

        success = notifier.send_completion_notice(stats)
        if success:
            logger.info(f"Slack 완료 알림 발송 성공: #{config.slack_notify_channel}")
        else:
            logger.warning("Slack 알림 발송 실패")

    except ConfigError as e:
        logger.warning(f"Slack 알림 건너뜀 (설정 오류): {e}")
    except Exception as e:
        logger.error(f"Slack 알림 발송 중 예외: {e}")


def main() -> int:
    """
    메인 진입점. 전체 파이프라인을 순서대로 실행한다.

    Returns:
        종료 코드 (0: 성공, 1: 실패)
    """
    args = parse_args()
    start_time = time.time()

    # 날짜 문자열 및 경로 설정
    today_str = datetime.now().strftime("%Y%m%d")
    base_dir = Path(__file__).parent

    # 로깅 초기화
    log_dir = base_dir / "logs"
    setup_logging(log_dir, today_str)
    logger = logging.getLogger("main")

    logger.info("=" * 60)
    logger.info("신규 입사자 온보딩 시스템 시작")
    logger.info(f"실행 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"모드: {'수집만' if args.collect_only else '분석만' if args.analyze_only else '전체'}"
                f"{' (dry-run)' if args.dry_run else ''}")
    logger.info("=" * 60)

    # 설정 로드
    try:
        config_path = args.config if args.config else str(base_dir / "config" / "config.yaml")
        config = ConfigLoader(config_path=config_path).load()
        logger.info(f"설정 로드 완료: {config_path}")
    except ConfigError as e:
        logger.error(f"설정 로드 실패: {e}")
        return 1
    except Exception as e:
        logger.error(f"예상치 못한 설정 오류: {e}")
        return 1

    slack_data: dict = {}
    notion_data: list = []
    analysis: dict = {}
    guide_path: str = ""
    notion_guide_url: str = ""

    try:
        # === 1단계: 데이터 수집 ===
        if not args.analyze_only:
            slack_data, notion_data = run_collect(config, base_dir)

        if args.collect_only:
            logger.info("--collect-only 모드: 수집 완료 후 종료")
            duration = int(time.time() - start_time)
            logger.info(f"총 소요 시간: {duration}초")
            return 0

        # === 2단계: 데이터 분석 ===
        analysis = run_analyze(config, base_dir, slack_data, notion_data)

        # === 3단계: 가이드 및 리포트 생성 ===
        guide_path, report_path = run_generate(config, base_dir, analysis)

        # === 4단계: Notion 업로드 (선택) ===
        if config.notion_upload_enabled and not args.dry_run:
            logger.info("=== Notion 업로드 ===")
            upload_page_id = config.notion_upload_page_id
            if upload_page_id and guide_path:
                try:
                    uploader = NotionUploader(
                        token=config.notion_api_key,
                        target_page_id=upload_page_id,
                    )
                    notion_guide_url = uploader.upload(guide_path) or ""
                    if notion_guide_url:
                        logger.info(f"Notion 업로드 완료: {notion_guide_url}")
                except Exception as e:
                    logger.error(f"Notion 업로드 실패: {e}")
            else:
                logger.warning("Notion 업로드 설정 누락: NOTION_UPLOAD_PAGE_ID 또는 가이드 파일 경로 없음")
        elif args.dry_run:
            logger.info("--dry-run 모드: Notion 업로드 생략")

        # === 5단계: Slack 완료 알림 ===
        run_notify(config, analysis, guide_path, notion_guide_url, start_time, args.dry_run)

    except KeyboardInterrupt:
        logger.warning("사용자에 의해 중단됨")
        return 1
    except Exception as e:
        logger.error(f"파이프라인 실행 중 예외 발생: {e}", exc_info=True)

        # 오류 알림 발송 시도 (dry-run이 아닐 때)
        if not args.dry_run:
            try:
                notifier = SlackNotifier(
                    token=config.slack_token,
                    channel=config.slack_notify_channel,
                )
                notifier.send_error_notice(str(e))
            except Exception:
                pass  # 알림 발송 실패는 무시

        return 1

    # 완료 요약
    duration = int(time.time() - start_time)
    logger.info("=" * 60)
    logger.info("파이프라인 완료")
    logger.info(f"  온보딩 가이드: {guide_path}")
    logger.info(f"  소요 시간: {duration}초")
    logger.info("=" * 60)

    if duration > 600:
        logger.warning(f"소요 시간 {duration}초가 목표(600초)를 초과했습니다.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
