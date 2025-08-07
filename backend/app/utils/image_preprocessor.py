from PIL import Image
import os
from pathlib import Path
from typing import Optional

class ImagePreprocessor:
    @staticmethod
    def convert_to_rgb(image_path: str, output_path: Optional[str] = None) -> str:
        """이미지를 RGB 모드로 변환하여 저장"""
        try:
            with Image.open(image_path) as img:
                if img.mode == 'RGBA':
                    # 흰색 배경으로 변환
                    rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                    rgb_img.paste(img, mask=img.split()[-1])  # 알파 채널을 마스크로 사용
                elif img.mode != 'RGB':
                    rgb_img = img.convert('RGB')
                else:
                    rgb_img = img.copy()
                
                # 출력 경로가 지정되지 않으면 원본 경로 사용
                if output_path is None:
                    output_path = image_path
                
                # JPEG 형식으로 저장 (확장자 변경)
                if not output_path.lower().endswith(('.jpg', '.jpeg')):
                    path_obj = Path(output_path)
                    output_path = str(path_obj.with_suffix('.jpg'))
                
                rgb_img.save(output_path, 'JPEG', quality=95)
                return output_path
                
        except Exception as e:
            print(f"이미지 변환 실패: {e}")
            return image_path  # 실패 시 원본 경로 반환
    
    @staticmethod
    def preprocess_for_ootd(image_path: str) -> str:
        """OOTDiffusion용 이미지 전처리"""
        return ImagePreprocessor.convert_to_rgb(image_path)
