from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class VirtualFittingStartRequest(BaseModel):
    category: int
    model_type: str = "dc"
    scale: float = 2.0
    samples: int = 4

class VirtualFittingStartResponse(BaseModel):
    success: bool
    message: str
    process_id: int

class VirtualFittingStatusResponse(BaseModel):
    process_id: int
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    result_images: List[str] = []
    # 인덱스-URL 매핑 (정확한 선택을 위해 추가)
    result_items: List[dict] = []
    error_message: Optional[str] = None  # 에러 메시지 추가
    model_image_url: Optional[str] = None
    cloth_image_url: Optional[str] = None

class VirtualFittingSelectRequest(BaseModel):
    process_id: int
    selected_image_index: int
    title: Optional[str] = None

class VirtualFittingSelectResponse(BaseModel):
    success: bool
    message: str
    fitting_id: int
    image_url: str
    title: Optional[str] = None

class VirtualFittingItem(BaseModel):
    fitting_id: int
    title: Optional[str] = None
    image_url: str
    created_at: datetime

class VirtualFittingListResponse(BaseModel):
    fittings: List[VirtualFittingItem]
    total: int
    page: int
    per_page: int
    total_pages: int
    
class VirtualFittingProcessItem(BaseModel):
    process_id: int
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    result_image_count: int
    error_message: Optional[str] = None

class VirtualFittingProcessListResponse(BaseModel):
    processes: List[VirtualFittingProcessItem]
    total: int
    page: int
    per_page: int
    total_pages: int