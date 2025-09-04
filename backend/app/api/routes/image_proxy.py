# image_proxy.py
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, HttpUrl
from urllib.parse import urlparse
import os, uuid, shutil
import httpx  # NEW

router = APIRouter(prefix="/api/image-proxy", tags=["image-proxy"])

class ProxyRequest(BaseModel):
    url: HttpUrl

@router.post("/fetch")
async def proxy_fetch_image(payload: ProxyRequest, request: Request):
    src_url = str(payload.url)
    parsed = urlparse(src_url)
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail="지원하지 않는 URL 스킴입니다.")

    # 1) 같은 서버의 /uploads/** 면 네트워크 왕복 없이 파일로 바로 처리 (자기 호출 회피)
    same_host = parsed.hostname in {"localhost", "127.0.0.1", request.url.hostname}
    same_port = (parsed.port in {None, request.url.port, 8000})
    if same_host and same_port and parsed.path.startswith("/uploads/"):
        local_src = os.path.abspath(parsed.path.lstrip("/"))
        if not os.path.exists(local_src):
            raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
        ext = os.path.splitext(local_src)[1] or ".jpg"
        save_dir = os.path.join("uploads", "temp_images", "proxy")
        os.makedirs(save_dir, exist_ok=True)
        filename = f"proxy_{uuid.uuid4().hex}{ext}"
        dst = os.path.join(save_dir, filename)
        shutil.copyfile(local_src, dst)
        relative_path = f"uploads/temp_images/proxy/{filename}"
        return {"relative_path": relative_path, "url": f"/{relative_path}"}

    # 2) 외부 오리진은 비동기로 가져오기
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=httpx.Timeout(15.0)) as client:
            resp = await client.get(src_url)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"원격 이미지를 가져오지 못했습니다: {resp.status_code}")

        ctype = (resp.headers.get("content-type") or "").lower()
        ext = ".png" if "png" in ctype else ".webp" if "webp" in ctype else ".jpg"

        save_dir = os.path.join("uploads", "temp_images", "proxy")
        os.makedirs(save_dir, exist_ok=True)
        filename = f"proxy_{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(save_dir, filename)
        with open(file_path, "wb") as f:
            f.write(resp.content)

        relative_path = f"uploads/temp_images/proxy/{filename}"
        return {"relative_path": relative_path, "url": f"/{relative_path}"}
    except httpx.ReadTimeout:
        raise HTTPException(status_code=504, detail="원격 이미지 응답 지연으로 타임아웃")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이미지 프록시 실패: {e}")
