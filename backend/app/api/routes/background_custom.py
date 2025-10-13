from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import Optional
import os
import uuid
import logging
from pathlib import Path

from app.db.database import get_db
from app.api.dependencies import get_current_user
from app.models.users import Users
from app.models.virtual_fittings import VirtualFittings
from app.models.background_customs import BackgroundCustoms
from app.utils.background_removal_service import background_removal_service
from app.schemas.background_custom import (
    BackgroundCustomRequest,
    BackgroundCustomResponse,
    BackgroundCustomListResponse,
)

router = APIRouter(prefix="/api/background-custom", tags=["background-custom"])

logger = logging.getLogger(__name__)


@router.post("/preview")
async def preview_background_custom(
    fitting_id: int = Form(..., description="가상피팅 결과 ID"),
    background_image: UploadFile = File(None, description="배경 이미지"),
    background_path: str = Form(None, description="기본 배경 이미지 경로"),
    background_color: str = Form(None, description="배경 색상"),
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user),
):
    """배경 커스텀 미리보기 (DB 저장 없음)"""
    try:
        # 가상피팅 결과 조회
        fitting_result = (
            db.query(VirtualFittings)
            .filter(
                VirtualFittings.fitting_id == fitting_id,
                VirtualFittings.user_id == current_user.user_id,
            )
            .first()
        )

        if not fitting_result:
            raise HTTPException(
                status_code=404, detail="가상피팅 결과를 찾을 수 없습니다."
            )

        # 원본 이미지 경로 확인
        original_image_path = Path(fitting_result.fitting_image_url)
        if not original_image_path.is_absolute():
            original_image_path = (
                Path(__file__).parent.parent.parent.parent / original_image_path
            )

        if not original_image_path.exists():
            raise HTTPException(
                status_code=404, detail="원본 이미지 파일을 찾을 수 없습니다."
            )

        # 배경 처리
        project_root = Path(__file__).parent.parent.parent.parent

        if background_image and background_image.filename:
            # 업로드된 배경 이미지 저장 (임시)
            print(f"업로드된 배경 이미지 처리: {background_image.filename}")
            saved_background_path = await save_background_image(
                background_image, current_user.user_id
            )
            absolute_background_path = project_root / saved_background_path

            # 로컬 배경 제거 서비스를 사용하여 원본 이미지의 배경 제거
            foreground_bytes = background_removal_service.remove_background_advanced(
                str(original_image_path)
            )
            if not foreground_bytes:
                raise HTTPException(status_code=500, detail="배경 제거에 실패했습니다.")

            # 배경 이미지 파일 존재 확인
            if not absolute_background_path.exists():
                raise HTTPException(
                    status_code=404,
                    detail=f"배경 이미지 파일을 찾을 수 없습니다: {absolute_background_path}",
                )

            # 배경 이미지 읽기
            with open(absolute_background_path, "rb") as f:
                background_bytes = f.read()

        elif background_path:
            # 기본 배경 이미지 경로 사용
            print(f"기본 배경 이미지 경로: {background_path}")
            # 경로가 '/'로 시작하는 경우 제거
            clean_path = background_path.lstrip("/")
            absolute_background_path = project_root / clean_path

            # 로컬 배경 제거 서비스를 사용하여 원본 이미지의 배경 제거
            foreground_bytes = background_removal_service.remove_background_advanced(
                str(original_image_path)
            )
            if not foreground_bytes:
                raise HTTPException(status_code=500, detail="배경 제거에 실패했습니다.")

            # 배경 이미지 파일 존재 확인
            if not absolute_background_path.exists():
                raise HTTPException(
                    status_code=404,
                    detail=f"배경 이미지 파일을 찾을 수 없습니다: {absolute_background_path}",
                )

            # 배경 이미지 읽기
            with open(absolute_background_path, "rb") as f:
                background_bytes = f.read()

        elif background_color:
            # 색상 배경 처리
            print(f"색상 배경 처리: {background_color}")

            # 로컬 배경 제거 서비스를 사용하여 원본 이미지의 배경 제거
            foreground_bytes = background_removal_service.remove_background_advanced(
                str(original_image_path)
            )
            if not foreground_bytes:
                raise HTTPException(status_code=500, detail="배경 제거에 실패했습니다.")

            # 색상 배경 생성
            background_bytes = background_removal_service.create_color_background(
                background_color, foreground_bytes
            )
            if not background_bytes:
                raise HTTPException(
                    status_code=500, detail="색상 배경 생성에 실패했습니다."
                )
        else:
            raise HTTPException(
                status_code=400, detail="배경 이미지 또는 색상이 필요합니다."
            )

        # 이미지 합성
        combined_bytes = background_removal_service.combine_with_background(
            foreground_bytes, background_bytes
        )
        if not combined_bytes:
            raise HTTPException(status_code=500, detail="이미지 합성에 실패했습니다.")

        # Base64로 인코딩하여 직접 반환 (파일 저장하지 않음)
        import base64

        image_base64 = base64.b64encode(combined_bytes).decode("utf-8")

        return BackgroundCustomResponse(
            success=True,
            message="미리보기가 생성되었습니다.",
            custom_fitting_id=0,  # 미리보기는 DB에 저장하지 않음
            image_url=f"data:image/png;base64,{image_base64}",  # Base64 데이터 URL
            title=f"{fitting_result.title} (미리보기)",
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"미리보기 생성 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/process", response_model=BackgroundCustomResponse)
async def process_background_custom(
    fitting_id: int = Form(..., description="가상피팅 결과 ID"),
    background_image: UploadFile = File(None, description="배경 이미지"),
    background_path: str = Form(None, description="기본 배경 이미지 경로"),
    background_color: str = Form(None, description="배경 색상"),
    title: str = Form("배경 커스텀 결과", description="제목"),
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user),
):
    """가상피팅 결과에 배경 커스텀 적용"""
    try:
        # 가상피팅 결과 조회
        fitting_result = (
            db.query(VirtualFittings)
            .filter(
                VirtualFittings.fitting_id == fitting_id,
                VirtualFittings.user_id == current_user.user_id,
            )
            .first()
        )

        if not fitting_result:
            raise HTTPException(
                status_code=404, detail="가상피팅 결과를 찾을 수 없습니다."
            )

        # 원본 이미지 경로 확인
        original_image_path = Path(fitting_result.fitting_image_url)
        if not original_image_path.is_absolute():
            original_image_path = (
                Path(__file__).parent.parent.parent.parent / original_image_path
            )

        if not original_image_path.exists():
            raise HTTPException(
                status_code=404, detail="원본 이미지 파일을 찾을 수 없습니다."
            )

        # 배경 처리
        project_root = Path(__file__).parent.parent.parent.parent

        if background_image and background_image.filename:
            # 업로드된 배경 이미지 저장
            print(f"업로드된 배경 이미지 처리: {background_image.filename}")
            saved_background_path = await save_background_image(
                background_image, current_user.user_id
            )
            absolute_background_path = project_root / saved_background_path

            # 로컬 배경 제거 서비스를 사용하여 원본 이미지의 배경 제거
            foreground_bytes = background_removal_service.remove_background_advanced(
                str(original_image_path)
            )
            if not foreground_bytes:
                raise HTTPException(status_code=500, detail="배경 제거에 실패했습니다.")

            # 배경 이미지 파일 존재 확인
            if not absolute_background_path.exists():
                raise HTTPException(
                    status_code=404,
                    detail=f"배경 이미지 파일을 찾을 수 없습니다: {absolute_background_path}",
                )

            # 배경 이미지 읽기
            with open(absolute_background_path, "rb") as f:
                background_bytes = f.read()

        elif background_path:
            # 기본 배경 이미지 경로 사용
            print(f"기본 배경 이미지 경로: {background_path}")
            # 경로가 '/'로 시작하는 경우 제거
            clean_path = background_path.lstrip("/")
            absolute_background_path = project_root / clean_path

            # 로컬 배경 제거 서비스를 사용하여 원본 이미지의 배경 제거
            foreground_bytes = background_removal_service.remove_background_advanced(
                str(original_image_path)
            )
            if not foreground_bytes:
                raise HTTPException(status_code=500, detail="배경 제거에 실패했습니다.")

            # 배경 이미지 파일 존재 확인
            if not absolute_background_path.exists():
                raise HTTPException(
                    status_code=404,
                    detail=f"배경 이미지 파일을 찾을 수 없습니다: {absolute_background_path}",
                )

            # 배경 이미지 읽기
            with open(absolute_background_path, "rb") as f:
                background_bytes = f.read()

        elif background_color:
            # 색상 배경 처리
            print(f"색상 배경 처리: {background_color}")

            # 로컬 배경 제거 서비스를 사용하여 원본 이미지의 배경 제거
            foreground_bytes = background_removal_service.remove_background_advanced(
                str(original_image_path)
            )
            if not foreground_bytes:
                raise HTTPException(status_code=500, detail="배경 제거에 실패했습니다.")

            # 색상 배경 생성
            background_bytes = background_removal_service.create_color_background(
                background_color, foreground_bytes
            )
            if not background_bytes:
                raise HTTPException(
                    status_code=500, detail="색상 배경 생성에 실패했습니다."
                )

        else:
            raise HTTPException(
                status_code=400, detail="배경 이미지 또는 색상이 필요합니다."
            )

        # 이미지 합성
        combined_bytes = background_removal_service.combine_with_background(
            foreground_bytes, background_bytes
        )
        if not combined_bytes:
            raise HTTPException(status_code=500, detail="이미지 합성에 실패했습니다.")

        # 결과 이미지 저장
        result_filename = f"custom_{fitting_id}_{uuid.uuid4().hex[:8]}.png"
        result_dir = (
            Path(__file__).parent.parent.parent.parent / "uploads" / "background_custom"
        )
        result_dir.mkdir(parents=True, exist_ok=True)
        result_path = result_dir / result_filename

        if not background_removal_service.save_image(combined_bytes, str(result_path)):
            raise HTTPException(
                status_code=500, detail="결과 이미지 저장에 실패했습니다."
            )

        # 상대 경로로 변환
        relative_result_path = f"uploads/background_custom/{result_filename}"

        # 데이터베이스에 결과 저장 (삭제된 ID 재사용)
        # 배경 이미지 경로 설정
        if background_image and background_image.filename:
            # 업로드된 배경 이미지의 경우 저장된 경로 사용
            db_background_path = saved_background_path
        else:
            # 기본 배경 이미지의 경우 원본 경로 사용
            db_background_path = background_path

        # 새로운 레코드 생성
        custom_result = BackgroundCustoms(
            user_id=current_user.user_id,
            fitting_id=fitting_id,
            custom_image_url=relative_result_path,
            background_image_url=db_background_path,
            title=title,
        )

        db.add(custom_result)
        db.commit()
        db.refresh(custom_result)

        return BackgroundCustomResponse(
            success=True,
            message="배경 커스텀이 완료되었습니다.",
            custom_fitting_id=custom_result.custom_fitting_id,
            image_url=f"/api/background-custom/result/{custom_result.custom_fitting_id}",
            title=custom_result.title,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"배경 커스텀 처리 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/result/{custom_fitting_id}")
async def get_custom_result_image(
    custom_fitting_id: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user),
):
    """배경 커스텀 결과 이미지 조회 (저장된 결과 또는 미리보기)"""
    # 미리보기 파일인 경우 (custom_fitting_id가 0이거나 파일명이 preview_로 시작)
    if custom_fitting_id == 0:
        # 미리보기 파일 직접 접근
        project_root = Path(__file__).parent.parent.parent.parent
        preview_dir = project_root / "uploads" / "background_custom"

        # 가장 최근 미리보기 파일 찾기
        preview_files = list(preview_dir.glob("preview_*.png"))
        if preview_files:
            latest_preview = max(preview_files, key=lambda x: x.stat().st_mtime)
            return FileResponse(str(latest_preview))
        else:
            raise HTTPException(
                status_code=404, detail="미리보기 파일을 찾을 수 없습니다."
            )

    # 저장된 결과인 경우
    result = (
        db.query(BackgroundCustoms)
        .filter(
            BackgroundCustoms.custom_fitting_id == custom_fitting_id,
            BackgroundCustoms.user_id == current_user.user_id,
        )
        .first()
    )

    if not result:
        raise HTTPException(
            status_code=404, detail="배경 커스텀 결과를 찾을 수 없습니다."
        )

    # 상대 경로를 절대 경로로 변환
    project_root = Path(__file__).parent.parent.parent.parent
    absolute_path = project_root / result.custom_image_url

    if not absolute_path.exists():
        raise HTTPException(status_code=404, detail="이미지 파일을 찾을 수 없습니다.")

    return FileResponse(str(absolute_path))


@router.get("/history", response_model=BackgroundCustomListResponse)
async def get_custom_history(
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user),
):
    """사용자의 배경 커스텀 히스토리 조회"""
    skip = (page - 1) * per_page

    # 배경 커스텀 결과 조회
    results = (
        db.query(BackgroundCustoms)
        .filter(BackgroundCustoms.user_id == current_user.user_id)
        .offset(skip)
        .limit(per_page)
        .all()
    )

    total = (
        db.query(BackgroundCustoms)
        .filter(BackgroundCustoms.user_id == current_user.user_id)
        .count()
    )

    total_pages = (total + per_page - 1) // per_page

    return BackgroundCustomListResponse(
        custom_fittings=[
            {
                "custom_fitting_id": result.custom_fitting_id,
                "title": result.title,
                "image_url": f"/api/background-custom/result/{result.custom_fitting_id}",
                "created_at": result.created_at,
            }
            for result in results
        ],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.get("/backgrounds")
async def get_default_backgrounds():
    """기본 배경 이미지 목록 조회"""
    backgrounds_dir = (
        Path(__file__).parent.parent.parent.parent / "uploads" / "backgrounds"
    )

    if not backgrounds_dir.exists():
        return {"backgrounds": []}

    backgrounds = []
    for file_path in backgrounds_dir.glob("*"):
        if file_path.is_file() and file_path.suffix.lower() in [
            ".jpg",
            ".jpeg",
            ".png",
        ]:
            backgrounds.append(
                {
                    "filename": file_path.name,
                    "url": f"/uploads/backgrounds/{file_path.name}",
                }
            )

    return {"backgrounds": backgrounds}


async def save_background_image(file: UploadFile, user_id: int) -> str:
    """배경 이미지 파일 저장"""
    # 배경 디렉토리 생성
    project_root = Path(__file__).parent.parent.parent.parent
    background_dir = project_root / "uploads" / "custom_backgrounds"
    background_dir.mkdir(parents=True, exist_ok=True)

    # 고유한 파일명 생성
    file_ext = os.path.splitext(file.filename)[1]
    filename = f"user_{user_id}_{uuid.uuid4().hex}{file_ext}"
    file_path = background_dir / filename

    # 파일 저장
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)

    # 상대 경로 반환
    return f"uploads/custom_backgrounds/{filename}"


@router.get("/history/{fitting_id}")
async def get_background_custom_history(
    fitting_id: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user),
):
    """가상피팅 결과의 배경 커스텀 히스토리 조회"""
    try:
        # 해당 가상피팅 결과의 배경 커스텀 히스토리 조회
        history = (
            db.query(BackgroundCustoms)
            .filter(
                BackgroundCustoms.fitting_id == fitting_id,
                BackgroundCustoms.user_id == current_user.user_id,
            )
            .order_by(BackgroundCustoms.created_at.desc())
            .limit(20)  # 최근 20개만 조회
            .all()
        )

        # 결과를 딕셔너리로 변환
        history_data = []
        for item in history:
            # 이미지 URL을 절대 URL로 변환
            image_url = item.custom_image_url
            if image_url and not image_url.startswith("http"):
                # 상대 경로인 경우 절대 URL로 변환
                image_url = f"http://localhost:8000/{image_url.lstrip('/')}"

            history_data.append(
                {
                    "id": item.custom_fitting_id,
                    "title": item.title,
                    "image_url": image_url,
                    "created_at": item.created_at.isoformat(),
                }
            )

        return {"success": True, "history": history_data}

    except Exception as e:
        logger.error(f"배경 커스텀 히스토리 조회 중 오류 발생: {e}")
        raise HTTPException(
            status_code=500, detail=f"히스토리 조회 중 오류가 발생했습니다: {str(e)}"
        )


@router.delete("/history/{history_id}")
async def delete_background_custom_history(
    history_id: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user),
):
    """배경 커스텀 히스토리 삭제"""
    try:
        # 히스토리 아이템 조회
        history_item = (
            db.query(BackgroundCustoms)
            .filter(
                BackgroundCustoms.custom_fitting_id == history_id,
                BackgroundCustoms.user_id == current_user.user_id,
            )
            .first()
        )

        if not history_item:
            raise HTTPException(
                status_code=404, detail="히스토리 아이템을 찾을 수 없습니다."
            )

        # 이미지 파일 삭제
        if history_item.custom_image_url:
            image_path = Path(history_item.custom_image_url)
            if not image_path.is_absolute():
                image_path = Path(__file__).parent.parent.parent.parent / image_path

            if image_path.exists():
                image_path.unlink()
                print(f"이미지 파일 삭제됨: {image_path}")

        # 물리 삭제 (레코드 완전 삭제)
        db.delete(history_item)
        db.commit()

        return {"success": True, "message": "히스토리가 삭제되었습니다."}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"배경 커스텀 히스토리 삭제 중 오류 발생: {e}")
        raise HTTPException(
            status_code=500, detail=f"히스토리 삭제 중 오류가 발생했습니다: {str(e)}"
        )
