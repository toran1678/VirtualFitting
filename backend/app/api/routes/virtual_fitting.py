from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
    Query,
    Body,
)
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from typing import Optional, List
import os

from app.db.database import get_db
from app.api.dependencies import get_current_user
from app.models.users import Users
from app.models.virtual_fittings import VirtualFittings
from app.utils.virtual_fitting_service import fitting_service_redis
from app.crud.virtual_fitting import VirtualFittingCRUD
from app.core.task_queue import task_queue
from app.schemas.virtual_fitting import (
    VirtualFittingStartRequest,
    VirtualFittingStartResponse,
    VirtualFittingStatusResponse,
    VirtualFittingSelectRequest,
    VirtualFittingSelectResponse,
    VirtualFittingListResponse,
    VirtualFittingProcessItem,
    VirtualFittingProcessListResponse,
)

router = APIRouter(prefix="/api/virtual-fitting-redis", tags=["virtual-fitting-redis"])


@router.post("/start", response_model=VirtualFittingStartResponse)
async def start_virtual_fitting_redis(
    model_image: UploadFile = File(..., description="모델 이미지"),
    cloth_image: UploadFile = File(..., description="의류 이미지"),
    category: int = Form(..., description="카테고리 (0:상체, 1:하체, 2:드레스)"),
    model_type: str = Form("dc", description="모델 타입 (hd/dc)"),
    scale: float = Form(2.0, description="스케일"),
    samples: int = Form(4, description="생성할 샘플 수"),
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user),
):
    """가상 피팅 시작 (Redis 큐 사용)"""
    try:
        # 카테고리 유효성 검사
        if category not in [0, 1, 2]:
            raise HTTPException(
                status_code=400, detail="카테고리는 0, 1, 2 중 하나여야 합니다."
            )

        # 모델 타입 유효성 검사
        if model_type not in ["hd", "dc"]:
            raise HTTPException(
                status_code=400, detail="모델 타입은 'hd' 또는 'dc'여야 합니다."
            )

        # HD 모델은 상체만 지원
        if model_type == "hd" and category != 0:
            raise HTTPException(
                status_code=400, detail="HD 모델은 상체(category=0)만 지원합니다."
            )

        # 이미지 파일 저장
        model_image_path = await save_temp_image(model_image, "model")
        cloth_image_path = await save_temp_image(cloth_image, "cloth")

        # Redis 큐를 사용한 가상 피팅 시작
        process_id = await fitting_service_redis.start_virtual_fitting(
            db=db,
            user_id=current_user.user_id,
            model_image_path=model_image_path,
            cloth_image_path=cloth_image_path,
            category=category,
            model_type=model_type,
            scale=scale,
            samples=samples,
        )

        return VirtualFittingStartResponse(
            success=True,
            message="가상 피팅이 큐에 추가되었습니다.",
            process_id=process_id,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"가상 피팅 시작 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/status/{process_id}", response_model=VirtualFittingStatusResponse)
async def get_fitting_status_redis(
    process_id: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user),
):
    """가상 피팅 처리 상태 조회 (Redis 큐 사용)"""
    process = fitting_service_redis.get_fitting_status(
        db, process_id, current_user.user_id
    )

    if not process:
        raise HTTPException(
            status_code=404, detail="가상 피팅 처리를 찾을 수 없습니다."
        )

    # 결과 이미지 URL 생성 (정적 경로 반환하여 인증 없이 표시 가능)
    result_images = []
    result_items = []
    if process.status == "COMPLETED":
        for i in range(1, 7):
            image_path = getattr(process, f"result_image_{i}", None)
            if image_path:
                # DB에는 'uploads/...'로 저장되므로 앞에 '/'만 붙여 정적 경로 제공
                url = f"/{image_path}"
                result_images.append(url)
                result_items.append({"index": i, "url": url})

    # 입력 이미지 경로를 정적 URL 형태로 정규화
    def _to_static_url(path_str: Optional[str]) -> Optional[str]:
        if not path_str:
            return None
        try:
            # 윈도우 경로 구분자 처리 및 'uploads' 이하만 반환
            norm = str(path_str).replace("\\", "/")
            idx = norm.lower().find("uploads")
            if idx != -1:
                norm = norm[idx:]
            if not norm.startswith("uploads/"):
                return None
            return f"/{norm}"
        except Exception:
            return None

    return VirtualFittingStatusResponse(
        process_id=process_id,
        status=process.status,
        started_at=process.started_at,
        completed_at=process.completed_at,
        result_images=result_images,
        result_items=result_items,
        error_message=process.error_message if process.status == "FAILED" else None,
        model_image_url=_to_static_url(process.model_image_path),
        cloth_image_url=_to_static_url(process.cloth_image_path),
    )


@router.get("/processes", response_model=VirtualFittingProcessListResponse)
async def get_user_processes(
    page: int = Query(1, ge=1, description="페이지 번호"),
    per_page: int = Query(20, ge=1, le=50, description="페이지당 항목 수"),
    status: Optional[str] = Query(
        None, description="상태 필터 (QUEUED, PROCESSING, COMPLETED, FAILED)"
    ),
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user),
):
    """사용자의 모든 가상 피팅 프로세스 목록 조회"""
    skip = (page - 1) * per_page

    # 상태 필터 유효성 검사
    if status and status not in ["QUEUED", "PROCESSING", "COMPLETED", "FAILED"]:
        raise HTTPException(status_code=400, detail="유효하지 않은 상태입니다.")

    # CRUD를 통한 프로세스 목록 조회
    processes, total = VirtualFittingCRUD.get_user_fitting_processes(
        db=db,
        user_id=current_user.user_id,
        skip=skip,
        limit=per_page,
        status_filter=status,
    )

    total_pages = (total + per_page - 1) // per_page

    # 응답 데이터 구성
    process_list = []
    for process in processes:
        # 결과 이미지 개수 계산
        result_image_count = 0
        if process.status == "COMPLETED":
            for i in range(1, 7):
                if getattr(process, f"result_image_{i}", None):
                    result_image_count += 1

        process_data = {
            "process_id": process.id,
            "status": process.status,
            "started_at": process.started_at,
            "completed_at": process.completed_at,
            "result_image_count": result_image_count,
            "error_message": (
                process.error_message if process.status == "FAILED" else None
            ),
        }
        process_list.append(process_data)

    return VirtualFittingProcessListResponse(
        processes=process_list,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.get("/statistics")
async def get_user_statistics(
    db: Session = Depends(get_db), current_user: Users = Depends(get_current_user)
):
    """사용자의 가상 피팅 프로세스 통계"""
    stats = VirtualFittingCRUD.get_user_process_statistics(db, current_user.user_id)

    return {
        "success": True,
        "data": {"process_stats": stats, "total_processes": sum(stats.values())},
    }


@router.get("/queue-info")
async def get_queue_info(
    db: Session = Depends(get_db), current_user: Users = Depends(get_current_user)
):
    """큐 정보 조회"""
    queue_info = task_queue.get_queue_info()
    return {"success": True, "data": queue_info}


@router.post("/select", response_model=VirtualFittingSelectResponse)
async def select_fitting_result_redis(
    request: VirtualFittingSelectRequest,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user),
):
    """가상 피팅 결과 선택 (선택 후 프로세스 삭제)"""
    if request.selected_image_index < 1 or request.selected_image_index > 6:
        raise HTTPException(
            status_code=400, detail="선택할 이미지 인덱스는 1-6 사이여야 합니다."
        )

    result = fitting_service_redis.select_fitting_result(
        db=db,
        process_id=request.process_id,
        user_id=current_user.user_id,
        selected_image_index=request.selected_image_index,
        title=request.title,
    )

    if not result:
        raise HTTPException(
            status_code=404, detail="가상 피팅 결과를 선택할 수 없습니다."
        )

    return VirtualFittingSelectResponse(
        success=True,
        message="가상 피팅 결과가 저장되었습니다. 임시 작업 데이터가 정리되었습니다.",
        fitting_id=result.fitting_id,
        image_url=f"/api/virtual-fitting-redis/result/{result.fitting_id}",
        title=result.title,
    )


@router.delete("/process/{process_id}")
async def cancel_fitting_process(
    process_id: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user),
):
    """가상 피팅 프로세스 취소 및 삭제"""
    process = fitting_service_redis.get_fitting_status(
        db, process_id, current_user.user_id
    )

    if not process:
        raise HTTPException(
            status_code=404, detail="가상 피팅 처리를 찾을 수 없습니다."
        )

    try:
        # 프로세스의 모든 이미지들 정리
        fitting_service_redis._cleanup_all_process_images(process)

        # 프로세스 삭제
        db.delete(process)
        db.commit()

        return {
            "success": True,
            "message": "가상 피팅 프로세스가 취소되고 삭제되었습니다.",
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"프로세스 삭제 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/image/{process_id}/{image_index}")
async def get_result_image_redis(
    process_id: int,
    image_index: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user),
):
    """가상 피팅 결과 이미지 조회"""
    process = fitting_service_redis.get_fitting_status(
        db, process_id, current_user.user_id
    )

    if not process or process.status != "COMPLETED":
        raise HTTPException(status_code=404, detail="이미지를 찾을 수 없습니다.")

    relative_path = getattr(process, f"result_image_{image_index}", None)
    if not relative_path:
        raise HTTPException(status_code=404, detail="이미지 파일을 찾을 수 없습니다.")

    # 상대 경로를 절대 경로로 변환
    from pathlib import Path

    project_root = Path(__file__).parent.parent.parent.parent
    absolute_path = project_root / relative_path

    if not absolute_path.exists():
        raise HTTPException(status_code=404, detail="이미지 파일을 찾을 수 없습니다.")

    return FileResponse(str(absolute_path))


@router.get("/result/{fitting_id}")
async def get_fitting_result_image_redis(
    fitting_id: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user),
):
    """저장된 가상 피팅 결과 이미지 조회"""
    result = (
        db.query(VirtualFittings)
        .filter(
            VirtualFittings.fitting_id == fitting_id,
            VirtualFittings.user_id == current_user.user_id,
        )
        .first()
    )

    if not result:
        raise HTTPException(
            status_code=404, detail="가상 피팅 결과를 찾을 수 없습니다."
        )

    # 상대 경로를 절대 경로로 변환
    from pathlib import Path
    import os
    from datetime import datetime

    project_root = Path(__file__).parent.parent.parent.parent
    absolute_path = project_root / result.fitting_image_url

    if not absolute_path.exists():
        raise HTTPException(status_code=404, detail="이미지 파일을 찾을 수 없습니다.")

    # 파일 수정 시간을 가져와서 ETag 생성 (캐시 버스팅용)
    file_stat = os.stat(absolute_path)
    last_modified = datetime.fromtimestamp(file_stat.st_mtime)
    etag = f'"{file_stat.st_mtime}-{file_stat.st_size}"'

    # FileResponse에 캐시 방지 헤더 추가
    response = FileResponse(
        str(absolute_path),
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "ETag": etag,
            "Last-Modified": last_modified.strftime("%a, %d %b %Y %H:%M:%S GMT"),
        },
    )

    return response


@router.get("/history", response_model=VirtualFittingListResponse)
async def get_fitting_history_redis(
    page: int = Query(1, ge=1, description="페이지 번호"),
    per_page: int = Query(20, ge=1, le=50, description="페이지당 항목 수"),
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user),
):
    """사용자의 가상 피팅 히스토리 조회"""
    skip = (page - 1) * per_page

    results, total = VirtualFittingCRUD.get_user_fitting_results(
        db=db, user_id=current_user.user_id, skip=skip, limit=per_page
    )

    total_pages = (total + per_page - 1) // per_page

    return VirtualFittingListResponse(
        fittings=[
            {
                "fitting_id": result.fitting_id,
                "title": result.title,
                "image_url": f"/api/virtual-fitting-redis/result/{result.fitting_id}",
                "created_at": result.created_at,
            }
            for result in results
        ],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.get("/original-image/{fitting_id}")
async def get_original_fitting_image(
    fitting_id: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user),
):
    """가상 피팅의 원본 이미지 조회 (배경 커스텀용)"""
    from app.models.virtual_fittings import VirtualFittings

    # 가상 피팅 결과 조회
    fitting = (
        db.query(VirtualFittings)
        .filter(
            VirtualFittings.fitting_id == fitting_id,
            VirtualFittings.user_id == current_user.user_id,
        )
        .first()
    )

    if not fitting:
        raise HTTPException(
            status_code=404, detail="가상 피팅 결과를 찾을 수 없습니다."
        )

    # 원본 이미지 경로 반환 (source_model_image_url 사용)
    if fitting.source_model_image_url:
        return {"original_image_url": f"/{fitting.source_model_image_url}"}
    else:
        raise HTTPException(
            status_code=404, detail="원본 이미지 경로를 찾을 수 없습니다."
        )


@router.delete("/result/{fitting_id}")
async def delete_fitting_result(
    fitting_id: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user),
):
    """저장된 가상 피팅 결과 삭제"""
    success = VirtualFittingCRUD.delete_fitting_result(
        db=db, fitting_id=fitting_id, user_id=current_user.user_id
    )

    if not success:
        raise HTTPException(
            status_code=404, detail="가상 피팅 결과를 찾을 수 없습니다."
        )

    return {"success": True, "message": "가상 피팅 결과가 삭제되었습니다."}


async def save_temp_image(file: UploadFile, prefix: str) -> str:
    """임시 이미지 파일 저장"""
    import uuid

    # 임시 디렉토리 생성
    temp_dir = "uploads/temp_images"
    os.makedirs(temp_dir, exist_ok=True)

    # 고유한 파일명 생성
    file_ext = os.path.splitext(file.filename)[1]
    filename = f"{prefix}_{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(temp_dir, filename)

    # 파일 저장
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)

    return file_path


@router.post("/save-result")
async def save_leffa_result(
    request_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user),
):
    """Leffa 결과 저장 (프론트에서 받은 이미지 URL들을 다운로드하여 저장)"""
    import httpx
    import uuid
    from datetime import datetime

    try:
        result_name = request_data.get("result_name")
        image_urls = request_data.get("image_urls", [])
        model_type = request_data.get("model_type", "leffa")
        fitting_type = request_data.get("fitting_type", "상의")

        if not result_name or not image_urls:
            raise HTTPException(
                status_code=400, detail="결과 이름과 이미지가 필요합니다."
            )

        # 결과 저장 디렉토리 (기존 가상 피팅과 동일한 경로 사용)
        result_dir = "uploads/selected_fittings"
        os.makedirs(result_dir, exist_ok=True)

        # 이미지 다운로드 및 저장
        saved_image_paths = []
        async with httpx.AsyncClient(timeout=30.0) as client:
            for idx, image_url in enumerate(image_urls):
                try:
                    # Hugging Face에서 이미지 다운로드
                    response = await client.get(image_url)
                    if response.status_code == 200:
                        # 기존 가상 피팅 형식에 맞게 파일명 생성
                        import time

                        timestamp = int(time.time())
                        random_hex = uuid.uuid4().hex[:8]
                        filename = (
                            f"user_{current_user.user_id}_{timestamp}_{random_hex}.png"
                        )
                        file_path = os.path.join(result_dir, filename)

                        # 파일 저장
                        with open(file_path, "wb") as f:
                            f.write(response.content)

                        saved_image_paths.append(file_path)
                except Exception as e:
                    continue

        if not saved_image_paths:
            raise HTTPException(status_code=500, detail="이미지 저장에 실패했습니다.")

        # 첫 번째 이미지를 대표 이미지로 사용
        result_image_path = saved_image_paths[0]

        # DB에 저장할 경로 형식: uploads/selected_fittings/user_X_timestamp_hash.png
        # Windows 경로 구분자를 슬래시로 변경
        db_path = result_image_path.replace("\\", "/")

        # DB에 저장
        new_fitting = VirtualFittings(
            user_id=current_user.user_id, fitting_image_url=db_path, title=result_name
        )

        db.add(new_fitting)
        db.commit()
        db.refresh(new_fitting)

        return {
            "message": "결과가 저장되었습니다.",
            "fitting_id": new_fitting.fitting_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"결과 저장 실패: {str(e)}")
