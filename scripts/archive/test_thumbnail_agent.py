#!/usr/bin/env python3
"""Local testing script for thumbnail caption agent."""

import sys
import json
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from ash_bot.core.thumbnail_agent import ThumbnailAgent
from ash_bot.utils.logger import get_logger

logger = get_logger(__name__)


def print_separator(char="=", length=80):
    """Print visual separator."""
    print(f"\n{char * length}\n")


def print_caption_result(result):
    """Pretty print caption result."""
    print("📊 생성된 캡션 분석 결과")
    print_separator()

    # Request info
    req = result.request
    print(f"영상 제목: {req['video_title']}")
    print(f"키워드: {', '.join(req['keywords'])}")
    print(f"타겟: {req['target_audience']}")
    print(f"생성 시간: {result.timestamp}")

    print_separator()

    # Top 5
    print("🏆 상위 5개 캡션\n")
    for idx, caption_data in enumerate(result.top_5, 1):
        print(f"옵션 {idx}:")
        print(f"  캡션: {caption_data['caption']}")
        print(f"  총점: {caption_data['overall_score']:.1f}/100")
        print(f"    - CTR 잠재력: {caption_data['ctr_potential']:.1f}")
        print(f"    - 명확성: {caption_data['clarity']:.1f}")
        print(f"    - 브랜드 일관성: {caption_data['brand_alignment']:.1f}")
        print(f"  피드백: {caption_data['feedback']}")
        print()

    print_separator()

    # All captions
    print(f"📋 생성된 전체 캡션 ({len(result.generated_captions)}개)\n")
    for idx, caption in enumerate(result.generated_captions, 1):
        print(f"{idx}. {caption}")

    print_separator()


def interactive_mode():
    """Interactive mode for testing."""
    print("\n🎬 YouTube 썸네일 캡션 생성 에이전트\n")
    print("Ctrl+C를 눌러 종료할 수 있습니다.\n")

    agent = ThumbnailAgent()

    while True:
        try:
            print("필요한 정보를 입력해주세요:")
            video_title = input("1. 영상 제목: ").strip()
            if not video_title:
                print("❌ 영상 제목은 필수입니다.\n")
                continue

            keywords_input = input("2. 키워드 (쉼표로 구분): ").strip()
            if not keywords_input:
                print("❌ 키워드는 필수입니다.\n")
                continue
            keywords = [k.strip() for k in keywords_input.split(",")]

            target_audience = input("3. 타겟 오디언스: ").strip()
            if not target_audience:
                print("❌ 타겟 오디언스는 필수입니다.\n")
                continue

            video_url = input("4. YouTube URL (선택사항): ").strip() or None

            print("\n⏳ 캡션을 생성하고 있습니다 (20-30초 소요)...\n")

            result = agent.generate_captions(
                video_title=video_title,
                keywords=keywords,
                target_audience=target_audience,
                video_url=video_url,
                created_by="local_test",
                count=18
            )

            if result:
                print_caption_result(result)

                # Save JSON
                json_file = agent.captions_dir / "last_result.json"
                import json
                with open(json_file, 'w', encoding='utf-8') as f:
                    from dataclasses import asdict
                    json.dump(asdict(result), f, ensure_ascii=False, indent=2)
                print(f"✅ 결과가 저장되었습니다: {json_file}\n")
            else:
                print("❌ 캡션 생성에 실패했습니다.\n")

            again = input("다시 시도하시겠습니까? (y/n): ").strip().lower()
            if again != 'y':
                break

            print()

        except KeyboardInterrupt:
            print("\n\n종료합니다.")
            break
        except Exception as e:
            logger.error(f"Error: {e}")
            print(f"❌ 오류 발생: {e}\n")


def batch_mode(input_file):
    """Batch mode for processing multiple requests."""
    import json

    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            requests = json.load(f)

        agent = ThumbnailAgent()

        for idx, req in enumerate(requests, 1):
            print(f"처리 중: {idx}/{len(requests)}")
            print(f"  영상: {req['video_title']}")

            result = agent.generate_captions(
                video_title=req['video_title'],
                keywords=req['keywords'],
                target_audience=req['target_audience'],
                video_url=req.get('video_url'),
                created_by=req.get('created_by', 'batch')
            )

            if result:
                print(f"  ✅ 완료 (상위점수: {result.top_5[0]['overall_score']:.1f})")
            else:
                print(f"  ❌ 실패")

    except Exception as e:
        logger.error(f"Batch processing error: {e}")
        print(f"❌ 배치 처리 오류: {e}")


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="YouTube 썸네일 캡션 생성 에이전트")
    parser.add_argument(
        "--batch",
        type=str,
        help="배치 모드: JSON 파일 경로 지정"
    )
    parser.add_argument(
        "--title",
        type=str,
        help="영상 제목"
    )
    parser.add_argument(
        "--keywords",
        type=str,
        help="키워드 (쉼표로 구분)"
    )
    parser.add_argument(
        "--audience",
        type=str,
        help="타겟 오디언스"
    )

    args = parser.parse_args()

    # Single shot mode
    if args.title and args.keywords and args.audience:
        agent = ThumbnailAgent()
        keywords = [k.strip() for k in args.keywords.split(",")]

        print(f"📝 요청: {args.title}")
        print("⏳ 생성 중...\n")

        result = agent.generate_captions(
            video_title=args.title,
            keywords=keywords,
            target_audience=args.audience,
            created_by="cli"
        )

        if result:
            print_caption_result(result)
        else:
            print("❌ 캡션 생성 실패")

    # Batch mode
    elif args.batch:
        batch_mode(args.batch)

    # Interactive mode
    else:
        interactive_mode()


if __name__ == "__main__":
    main()
