"""
guide_generator.py (outputs 레이어)
역할: ARCH.md의 출력 레이어(outputs/)에 위치하는 가이드 생성기.
      src/generators/guide_generator.py를 내부적으로 사용하여 파이프라인과 통합한다.
      분석 결과를 받아 ONBOARDING_GUIDE.md를 output/ 경로에 생성한다.
"""

import logging
from pathlib import Path
from typing import Any

# 실제 생성 로직은 generators 모듈에서 처리
from ..generators.guide_generator import GuideGenerator as _GuideGenerator

logger = logging.getLogger(__name__)


class GuideGenerator:
    """
    출력 레이어에서 가이드 생성을 담당하는 래퍼 클래스.
    template_path와 output_path를 주입받아 GuideGenerator를 실행한다.
    템플릿 파일이 없으면 자동으로 폴백 모드로 동작한다.
    """

    def __init__(
        self,
        analysis: dict[str, Any],
        template_path: str,
        output_path: str,
    ):
        """
        Args:
            analysis: 분석 결과 딕셔너리
            template_path: Jinja2 템플릿 파일 경로
            output_path: 생성할 가이드 파일 경로
        """
        self.analysis = analysis
        self.template_path = Path(template_path)
        self.output_path = output_path

    def generate(self) -> str:
        """
        온보딩 가이드를 생성한다.
        템플릿 파일이 있으면 Jinja2 렌더링, 없으면 폴백 모드로 생성한다.

        Returns:
            생성된 파일의 절대 경로 문자열
        """
        if self.template_path.exists():
            logger.info(f"템플릿 모드로 가이드 생성: {self.template_path}")
            try:
                generator = _GuideGenerator(
                    analysis=self.analysis,
                    template_path=str(self.template_path),
                )
                return generator.generate(self.output_path)
            except Exception as e:
                logger.warning(f"템플릿 렌더링 실패, 폴백 모드로 전환: {e}")
                return self._generate_fallback()
        else:
            logger.warning(f"템플릿 파일 없음, 폴백 모드로 생성: {self.template_path}")
            return self._generate_fallback()

    def _generate_fallback(self) -> str:
        """템플릿 없이 직접 Markdown을 생성하는 폴백 메서드."""
        # 임시 인스턴스로 폴백 생성 메서드 호출
        # template_path가 없어도 generate_without_template은 사용 가능
        from pathlib import Path as _Path

        # 더미 경로로 인스턴스 생성 후 폴백 메서드 직접 호출
        class _FallbackGenerator(_GuideGenerator):
            def __init__(self, analysis, template_path):
                # 부모 __init__ 건너뛰고 직접 속성 설정
                self.analysis = analysis
                self.template_path = _Path(template_path)
                self.env = None  # 폴백에서는 env 불필요

        fb = _FallbackGenerator(self.analysis, str(self.template_path))
        return fb.generate_without_template(self.output_path)

    def __repr__(self) -> str:
        return f"GuideGenerator(output={self.output_path})"
