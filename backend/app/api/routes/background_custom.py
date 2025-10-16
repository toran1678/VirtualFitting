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
    BackgroundCustomPreviewResponse,
    BackgroundCustomListResponse,
)

router = APIRouter(prefix="/api/background-custom", tags=["background-custom"])

logger = logging.getLogger(__name__)


@router.post("/preview", response_model=BackgroundCustomPreviewResponse)
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
            # 업로드된 배경 이미지 임시 처리 (저장하지 않음)
            print(f"업로드된 배경 이미지 미리보기 처리: {background_image.filename}")

            try:
                # 임시 파일로 저장해서 처리 (미리보기용)
                import tempfile
                import uuid

                # 임시 파일 생성
                file_ext = os.path.splitext(background_image.filename)[1]
                temp_filename = f"temp_{uuid.uuid4().hex}{file_ext}"
                temp_dir = project_root / "uploads" / "temp_images"
                temp_dir.mkdir(parents=True, exist_ok=True)
                temp_file_path = temp_dir / temp_filename

                # 파일 내용을 임시 파일에 저장
                file_content = await background_image.read()
                with open(temp_file_path, "wb") as f:
                    f.write(file_content)
                print(f"임시 파일 저장 완료: {temp_file_path}")

                # 로컬 배경 제거 서비스를 사용하여 원본 이미지의 배경 제거
                foreground_bytes = (
                    background_removal_service.remove_background_advanced(
                        str(original_image_path)
                    )
                )
                if not foreground_bytes:
                    raise HTTPException(
                        status_code=500, detail="배경 제거에 실패했습니다."
                    )
                print(f"배경 제거 완료, 전경 크기: {len(foreground_bytes)} bytes")

                # 배경 이미지 파일에서 바이트 읽기
                with open(temp_file_path, "rb") as f:
                    background_bytes = f.read()

                # 배경 이미지와 전경 이미지 결합
                combined_bytes = background_removal_service.combine_with_background(
                    foreground_bytes, background_bytes
                )
                if not combined_bytes:
                    raise HTTPException(
                        status_code=500, detail="이미지 결합에 실패했습니다."
                    )
                print(f"이미지 결합 완료, 결과 크기: {len(combined_bytes)} bytes")

                # 임시 파일 삭제
                try:
                    temp_file_path.unlink()
                    print(f"임시 파일 삭제 완료: {temp_file_path}")
                except Exception as cleanup_error:
                    print(f"임시 파일 삭제 실패: {cleanup_error}")

                # Base64로 인코딩하여 반환
                import base64

                base64_image = base64.b64encode(combined_bytes).decode("utf-8")
                image_url = f"data:image/png;base64,{base64_image}"

                return BackgroundCustomPreviewResponse(
                    success=True,
                    message="미리보기가 생성되었습니다.",
                    image_url=image_url,
                )
            except Exception as e:
                print(f"미리보기 처리 중 오류 발생: {str(e)}")
                import traceback

                traceback.print_exc()
                raise HTTPException(
                    status_code=500,
                    detail=f"미리보기 처리 중 오류가 발생했습니다: {str(e)}",
                )

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

        return BackgroundCustomPreviewResponse(
            success=True,
            message="미리보기가 생성되었습니다.",
            image_url=f"data:image/png;base64,{image_base64}",  # Base64 데이터 URL
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
    history_id: Optional[str] = Form(
        None, description="히스토리 아이템 ID (재사용 시)"
    ),
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user),
):
    """가상피팅 결과에 배경 커스텀 적용"""
    try:
        print(f"배경 커스텀 요청 받음:")
        print(f"  fitting_id: {fitting_id}")
        print(f"  title: {title}")
        print(f"  history_id: {history_id}")
        print(f"  background_image: {background_image}")
        print(f"  background_path: {background_path}")
        print(f"  background_color: {background_color}")
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

        # 히스토리 아이템이 선택된 경우 해당 이미지를 사용
        if history_id:
            try:
                history_id_int = int(history_id)
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=400, detail="잘못된 히스토리 ID 형식입니다."
                )

            print(f"히스토리 아이템 사용: {history_id_int}")
            history_item = (
                db.query(BackgroundCustoms)
                .filter(
                    BackgroundCustoms.custom_fitting_id == history_id_int,
                    BackgroundCustoms.user_id == current_user.user_id,
                )
                .first()
            )

            if not history_item:
                raise HTTPException(
                    status_code=404, detail="히스토리 아이템을 찾을 수 없습니다."
                )

            # 히스토리 아이템의 이미지를 기존 파일에 복사
            history_image_path = project_root / history_item.custom_image_url
            if not history_image_path.exists():
                raise HTTPException(
                    status_code=404, detail="히스토리 이미지 파일을 찾을 수 없습니다."
                )

            # 기존 가상피팅 결과의 이미지 경로 가져오기
            virtual_fitting = (
                db.query(VirtualFittings)
                .filter(
                    VirtualFittings.fitting_id == fitting_id,
                    VirtualFittings.user_id == current_user.user_id,
                )
                .first()
            )

            if not virtual_fitting:
                raise HTTPException(
                    status_code=404, detail="가상피팅 결과를 찾을 수 없습니다."
                )

            # 기존 이미지 파일 경로 (selected_fittings 폴더)
            existing_image_path = project_root / virtual_fitting.fitting_image_url

            # 히스토리 이미지를 기존 파일에 복사
            import shutil

            shutil.copy2(history_image_path, existing_image_path)

            print(
                f"히스토리 이미지 복사 완료: {history_image_path} -> {existing_image_path}"
            )

            return BackgroundCustomResponse(
                success=True,
                message="배경 커스텀이 완료되었습니다.",
                custom_fitting_id=history_id_int,
                image_url=f"/api/background-custom/result/{history_id_int}",
                title=title,
            )

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

        # 기존 가상피팅 결과의 이미지 경로 가져오기
        virtual_fitting = (
            db.query(VirtualFittings)
            .filter(
                VirtualFittings.fitting_id == fitting_id,
                VirtualFittings.user_id == current_user.user_id,
            )
            .first()
        )

        if not virtual_fitting:
            raise HTTPException(
                status_code=404, detail="가상피팅 결과를 찾을 수 없습니다."
            )

        # 기존 이미지 파일 경로 (selected_fittings 폴더)
        project_root = Path(__file__).parent.parent.parent.parent
        existing_image_path = project_root / virtual_fitting.fitting_image_url

        # 기존 이미지 파일이 존재하는지 확인
        if not existing_image_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"기존 가상피팅 이미지를 찾을 수 없습니다: {existing_image_path}",
            )

        # 배경 커스텀된 이미지를 기존 파일 경로에 덮어쓰기
        if not background_removal_service.save_image(
            combined_bytes, str(existing_image_path)
        ):
            raise HTTPException(
                status_code=500, detail="배경 커스텀 이미지 저장에 실패했습니다."
            )

        print(f"배경 커스텀 완료: 기존 이미지 덮어쓰기 성공 - {existing_image_path}")

        # 배경 커스텀 결과도 별도로 저장 (히스토리용)
        result_filename = f"custom_{fitting_id}_{uuid.uuid4().hex[:8]}.png"
        result_dir = (
            Path(__file__).parent.parent.parent.parent / "uploads" / "background_custom"
        )
        result_dir.mkdir(parents=True, exist_ok=True)
        result_path = result_dir / result_filename

        if not background_removal_service.save_image(combined_bytes, str(result_path)):
            raise HTTPException(
                status_code=500, detail="배경 커스텀 히스토리 저장에 실패했습니다."
            )

        # 상대 경로로 변환 (히스토리용)
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
            # 이미지 URL을 상대 경로로 변환
            image_url = item.custom_image_url
            if image_url and not image_url.startswith("http"):
                # 상대 경로로 반환 (nginx가 프록시)
                image_url = f"/{image_url.lstrip('/')}"

            history_data.append(
                {
                    "custom_fitting_id": item.custom_fitting_id,
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


@router.get("/recent-customs")
async def get_recent_custom_backgrounds(
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user),
):
    """최근 사용한 커스텀 배경 조회 (custom_backgrounds 폴더에서)"""
    try:
        import os
        from pathlib import Path

        # custom_backgrounds 폴더 경로
        project_root = Path(__file__).parent.parent.parent.parent
        custom_backgrounds_dir = project_root / "uploads" / "custom_backgrounds"

        # 사용자별 커스텀 배경 파일들 찾기
        user_prefix = f"user_{current_user.user_id}_"
        custom_backgrounds = []

        if custom_backgrounds_dir.exists():
            # 해당 사용자의 파일들만 필터링
            user_files = []
            for file_path in custom_backgrounds_dir.iterdir():
                if file_path.is_file() and file_path.name.startswith(user_prefix):
                    # 파일 수정 시간과 함께 저장
                    stat = file_path.stat()
                    user_files.append(
                        {
                            "path": file_path,
                            "name": file_path.name,
                            "mtime": stat.st_mtime,
                        }
                    )

            # 수정 시간 기준으로 정렬 (최신순)
            user_files.sort(key=lambda x: x["mtime"], reverse=True)

            # 최근 3개만 선택
            for file_info in user_files[:3]:
                # 파일명에서 확장자 제거하여 이름 생성
                file_name = file_info["name"]
                display_name = file_name.replace(user_prefix, "").split(".")[0]

                # 상대 경로 생성
                relative_path = f"uploads/custom_backgrounds/{file_name}"

                custom_backgrounds.append(
                    {
                        "id": file_name,  # 파일명을 ID로 사용
                        "name": display_name,
                        "url": f"/{relative_path}",  # 상대 경로로 반환 (nginx가 프록시)
                        "file_path": f"/{relative_path}",  # Add leading slash for consistency
                        "created_at": file_info["mtime"],
                    }
                )

        return {"success": True, "custom_backgrounds": custom_backgrounds}

    except Exception as e:
        logger.error(f"최근 커스텀 배경 조회 중 오류 발생: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"최근 커스텀 배경 조회 중 오류가 발생했습니다: {str(e)}",
        )
