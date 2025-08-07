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
    error_message: Optional[str] = None  # 에러 메시지 추가

class VirtualFittingSelectRequest(BaseModel):
    process_id: int
    selected_image_index: int

class VirtualFittingSelectResponse(BaseModel):
    success: bool
    message: str
    fitting_id: int
    image_url: str

class VirtualFittingItem(BaseModel):
    fitting_id: int
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