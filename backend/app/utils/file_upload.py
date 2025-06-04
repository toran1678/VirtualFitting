import os
import shutil
from fastapi import UploadFile

async def save_upload_file(upload_file: UploadFile, destination: str):
    """
    업로드된 파일을 지정된 경로에 저장하는 함수
    
    Args:
        upload_file (UploadFile): 업로드된 파일 객체
        destination (str): 저장할 경로
    """
    try:
        # 디렉토리 생성
        os.makedirs(os.path.dirname(destination), exist_ok=True)
        
        # 파일 저장
        with open(destination, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
    finally:
        upload_file.file.close()
    
    return destination
