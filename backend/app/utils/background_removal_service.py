import os
import cv2
import numpy as np
from PIL import Image
import io
import logging
from typing import Optional, Tuple
from rembg import remove, new_session

logger = logging.getLogger(__name__)


class BackgroundRemovalService:
    def __init__(self):
        """배경 제거 서비스 초기화"""
        # rembg 세션 초기화 (u2net 모델 사용)
        self.session = new_session("u2net")

    def remove_background_opencv(self, image_path: str) -> Optional[bytes]:
        """
        OpenCV를 사용한 기본적인 배경 제거 (색상 기반)

        Args:
            image_path: 입력 이미지 경로

        Returns:
            배경 제거된 이미지의 바이트 데이터 (PNG 형식)
        """
        try:
            # 이미지 읽기
            image = cv2.imread(image_path)
            if image is None:
                logger.error(f"이미지를 읽을 수 없습니다: {image_path}")
                return None

            # HSV 색공간으로 변환
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

            # 피부색 범위 정의 (HSV)
            lower_skin = np.array([0, 20, 70], dtype=np.uint8)
            upper_skin = np.array([20, 255, 255], dtype=np.uint8)

            # 피부색 마스크 생성
            mask = cv2.inRange(hsv, lower_skin, upper_skin)

            # 모폴로지 연산으로 노이즈 제거
            kernel = np.ones((5, 5), np.uint8)
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

            # 가우시안 블러 적용
            mask = cv2.GaussianBlur(mask, (5, 5), 0)

            # 마스크를 3채널로 변환
            mask_3ch = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)

            # 알파 채널 추가
            result = np.concatenate([image, mask], axis=2)

            # PIL Image로 변환
            pil_image = Image.fromarray(cv2.cvtColor(result, cv2.COLOR_BGRA2RGBA))

            # 바이트로 변환
            output = io.BytesIO()
            pil_image.save(output, format="PNG")
            output.seek(0)

            logger.info("OpenCV 배경 제거 완료")
            return output.getvalue()

        except Exception as e:
            logger.error(f"OpenCV 배경 제거 중 오류 발생: {e}")
            return None

    def remove_background_rembg(self, image_path: str) -> Optional[bytes]:
        """
        rembg 라이브러리를 사용한 AI 기반 배경 제거

        Args:
            image_path: 입력 이미지 경로

        Returns:
            배경 제거된 이미지의 바이트 데이터 (PNG 형식)
        """
        try:
            # 이미지 파일 읽기
            with open(image_path, "rb") as f:
                input_image = f.read()

            # rembg를 사용하여 배경 제거
            output_image = remove(input_image, session=self.session)

            logger.info("rembg 배경 제거 완료")
            return output_image

        except Exception as e:
            logger.error(f"rembg 배경 제거 중 오류 발생: {e}")
            return None

    def remove_background_from_bytes(self, image_bytes: bytes) -> Optional[bytes]:
        """
        바이트 데이터에서 직접 배경 제거

        Args:
            image_bytes: 입력 이미지 바이트 데이터

        Returns:
            배경 제거된 이미지의 바이트 데이터 (PNG 형식)
        """
        try:
            # rembg를 사용하여 배경 제거
            output_image = remove(image_bytes, session=self.session)

            logger.info("rembg 배경 제거 완료 (바이트)")
            return output_image

        except Exception as e:
            logger.error(f"rembg 배경 제거 중 오류 발생 (바이트): {e}")
            return None

    def combine_with_background(
        self, foreground_bytes: bytes, background_bytes: bytes
    ) -> Optional[bytes]:
        """
        전경 이미지와 배경 이미지를 합성

        Args:
            foreground_bytes: 전경 이미지 바이트 데이터 (투명 배경)
            background_bytes: 배경 이미지 바이트 데이터

        Returns:
            합성된 이미지의 바이트 데이터
        """
        try:
            # PIL Image 객체로 변환
            foreground = Image.open(io.BytesIO(foreground_bytes))
            background = Image.open(io.BytesIO(background_bytes))

            # 배경 이미지를 전경 이미지 크기에 맞게 리사이즈
            background = background.resize(foreground.size, Image.Resampling.LANCZOS)

            # RGBA 모드로 변환 (투명도 지원)
            if foreground.mode != "RGBA":
                foreground = foreground.convert("RGBA")
            if background.mode != "RGBA":
                background = background.convert("RGBA")

            # 이미지 합성 (전경을 배경 위에)
            result = Image.alpha_composite(background, foreground)

            # 결과를 바이트로 변환
            output = io.BytesIO()
            result.save(output, format="PNG")
            output.seek(0)

            logger.info("이미지 합성 완료")
            return output.getvalue()

        except Exception as e:
            logger.error(f"이미지 합성 중 오류 발생: {e}")
            return None

    def create_color_background(
        self, color_hex: str, foreground_bytes: bytes
    ) -> Optional[bytes]:
        """
        색상 배경 생성

        Args:
            color_hex: 색상 코드 (예: #FF0000)
            foreground_bytes: 전경 이미지 바이트 데이터

        Returns:
            색상 배경 이미지의 바이트 데이터
        """
        try:
            # PIL Image 객체로 변환
            foreground = Image.open(io.BytesIO(foreground_bytes))

            # 색상 코드 파싱
            if color_hex.startswith("#"):
                color_hex = color_hex[1:]

            # RGB 값으로 변환
            rgb = tuple(int(color_hex[i : i + 2], 16) for i in (0, 2, 4))

            # 전경 이미지 크기에 맞는 색상 배경 생성
            background = Image.new("RGBA", foreground.size, rgb + (255,))

            # 결과를 바이트로 변환
            output = io.BytesIO()
            background.save(output, format="PNG")
            output.seek(0)

            logger.info("색상 배경 생성 완료")
            return output.getvalue()

        except Exception as e:
            logger.error(f"색상 배경 생성 중 오류 발생: {e}")
            return None

    def save_image(self, image_bytes: bytes, output_path: str) -> bool:
        """
        이미지 바이트 데이터를 파일로 저장

        Args:
            image_bytes: 이미지 바이트 데이터
            output_path: 저장할 파일 경로

        Returns:
            저장 성공 여부
        """
        try:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)

            with open(output_path, "wb") as f:
                f.write(image_bytes)

            logger.info(f"이미지 저장 완료: {output_path}")
            return True

        except Exception as e:
            logger.error(f"이미지 저장 중 오류 발생: {e}")
            return False

    def remove_background_advanced(self, image_path: str) -> Optional[bytes]:
        """
        고급 배경 제거 (여러 방법 시도)

        Args:
            image_path: 입력 이미지 경로

        Returns:
            배경 제거된 이미지의 바이트 데이터 (PNG 형식)
        """
        # 먼저 rembg 시도
        result = self.remove_background_rembg(image_path)
        if result:
            return result

        # rembg 실패 시 OpenCV 시도
        logger.warning("rembg 실패, OpenCV 방법으로 시도")
        result = self.remove_background_opencv(image_path)
        if result:
            return result

        logger.error("모든 배경 제거 방법 실패")
        return None


# 전역 서비스 인스턴스
background_removal_service = BackgroundRemovalService()
