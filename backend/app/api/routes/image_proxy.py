from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl
from typing import Optional
import os
import uuid
import requests
from urllib.parse import urlparse

router = APIRouter(prefix="/api/image-proxy", tags=["image-proxy"])


class ProxyRequest(BaseModel):
    url: HttpUrl


@router.post("/fetch")
async def proxy_fetch_image(payload: ProxyRequest):
    """다운로드 불가한 외부 이미지(CORS)를 서버에서 받아 로컬로 저장 후 경로를 반환"""
    src_url = str(payload.url)
    parsed = urlparse(src_url)
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail="지원하지 않는 URL 스킴입니다.")

    try:
        resp = requests.get(src_url, timeout=15)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"원격 이미지를 가져오지 못했습니다: {resp.status_code}")

        # 저장 디렉토리
        save_dir = os.path.join("uploads", "temp_images", "proxy")
        os.makedirs(save_dir, exist_ok=True)

        # 확장자 추정
        ext = ".jpg"
        ctype = resp.headers.get("Content-Type", "").lower()
        if "png" in ctype:
            ext = ".png"
        elif "jpeg" in ctype or "jpg" in ctype:
            ext = ".jpg"
        elif "webp" in ctype:
            ext = ".webp"

        filename = f"proxy_{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(save_dir, filename)

        with open(file_path, "wb") as f:
            f.write(resp.content)

        relative_path = f"uploads/temp_images/proxy/{filename}"
        return {"relative_path": relative_path, "url": f"/{relative_path}"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이미지 프록시 실패: {e}")


