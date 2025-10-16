import os
import uuid
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime
import pytz
from sqlalchemy.orm import Session
from PIL import Image
import logging
import requests
import shutil

from gradio_client import Client, handle_file

from app.db.database import SessionLocal
from app.models.virtual_fitting_process import VirtualFittingProcess
from app.models.virtual_fittings import VirtualFittings
from app.core.task_queue import task_queue

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FastFittingService:
    def __init__(self):
        # 현재 파일 위치: backend/app/utils/fast_fitting_service.py
        # parent: utils → app → backend
        # backend 폴더를 project_root로 설정
        self.project_root = Path(__file__).parent.parent.parent
        
        # 가상 피팅 결과 저장 경로 (기존 가상 피팅과 동일)
        self.output_dir = self.project_root / "uploads" / "virtual_fitting_results"
        self.temp_dir = self.project_root / "uploads" / "temp_fitting"
        
        # 디렉토리 생성
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        
        # Hugging Face Gradio Clients
        self.change_clothes_client = None  # Change Clothes AI
        self.leffa_client = None           # Leffa AI
        
        # logger.info(f"FastFittingService 초기화: project_root={self.project_root}")
    
    def get_change_clothes_client(self):
        """Change Clothes AI Gradio Client 초기화"""
        if self.change_clothes_client is None:
            try:
                self.change_clothes_client = Client("jallenjia/Change-Clothes-AI")
                logger.info("Change Clothes AI 클라이언트 초기화 성공")
            except Exception as e:
                logger.error(f"Change Clothes AI 클라이언트 초기화 실패: {e}")
                raise
        return self.change_clothes_client
    
    def get_leffa_client(self):
        """Leffa AI Gradio Client 초기화"""
        if self.leffa_client is None:
            try:
                logger.info("Leffa AI 클라이언트 초기화 중...")
                
                # Gradio Client는 /config 엔드포인트를 사용하므로 정상 작동
                # /info 엔드포인트 오류는 무시 (Gradio가 자동 처리)
                self.leffa_client = Client(
                    "franciszzj/Leffa",
                    verbose=False,  # 불필요한 로그 숨김
                    download_files=False  # 파일 다운로드 최소화
                )
                
                logger.info("✅ Leffa AI 클라이언트 초기화 성공!")
                
            except Exception as e:
                logger.error(f"Leffa AI 클라이언트 초기화 실패: {e}")
                raise Exception(
                    "Leffa AI 모델 연결 실패. "
                    "잠시 후 다시 시도하거나 Change Clothes AI 모델을 사용해주세요."
                )
        
        return self.leffa_client
    
    def _prepare_local_image(self, image_path: str) -> str:
        """이미지 경로를 로컬 절대 경로로 변환 (URL인 경우 다운로드)"""
        try:
            logger.info(f"이미지 경로 준비 시작: {image_path}")
            
            # URL인 경우 다운로드
            if image_path.startswith('http://') or image_path.startswith('https://'):
                logger.info(f"URL 이미지 다운로드: {image_path}")
                
                # 임시 파일명 생성
                temp_filename = f"temp_{uuid.uuid4()}.jpg"
                temp_path = self.temp_dir / temp_filename
                
                # 이미지 다운로드
                response = requests.get(image_path, stream=True, timeout=30)
                response.raise_for_status()
                
                with open(temp_path, 'wb') as f:
                    shutil.copyfileobj(response.raw, f)
                
                logger.info(f"이미지 다운로드 완료: {temp_path}")
                return str(temp_path)
            
            # 경로 정규화 (백슬래시를 슬래시로)
            image_path = image_path.replace('\\', '/')
            
            # 상대 경로인 경우 절대 경로로 변환
            if not os.path.isabs(image_path):
                # project_root 기준 절대 경로 생성
                abs_path = self.project_root / image_path
                logger.info(f"상대 경로 → 절대 경로 변환: {abs_path}")
                logger.info(f"파일 존재 확인: {abs_path.exists()}")
                
                if abs_path.exists():
                    logger.info(f"파일 발견! {abs_path}")
                    return str(abs_path)
                else:
                    logger.error(f"파일이 존재하지 않음: {abs_path}")
                    logger.info(f"project_root: {self.project_root}")
                    logger.info(f"image_path: {image_path}")
                    
                    # 디버깅: 상위 디렉토리 확인
                    parent_dir = abs_path.parent
                    if parent_dir.exists():
                        logger.info(f"부모 디렉토리 존재: {parent_dir}")
                        logger.info(f"부모 디렉토리 내용: {list(parent_dir.iterdir())[:5]}")
                    
                    raise FileNotFoundError(f"이미지 파일을 찾을 수 없음: {abs_path}")
            
            # 이미 절대 경로인 경우
            else:
                logger.info(f"절대 경로로 전달됨: {image_path}")
                if os.path.exists(image_path):
                    logger.info(f"절대 경로 파일 존재: {image_path}")
                    return image_path
                else:
                    logger.error(f"절대 경로 파일이 존재하지 않음: {image_path}")
                    raise FileNotFoundError(f"이미지 파일을 찾을 수 없음: {image_path}")
                    
        except Exception as e:
            logger.error(f"이미지 준비 실패: {e}", exc_info=True)
            raise
    
    async def start_fast_fitting(
        self, 
        db: Session,
        user_id: int,
        person_image_path: str,
        upper_cloth_image_path: Optional[str],
        lower_cloth_image_path: Optional[str],
        fitting_type: str,  # "상의", "하의", "드레스", "상의+하의"
        garment_description: str = "Fast virtual fitting",
        model_type: str = "change-clothes",  # "change-clothes" or "leffa"
        leffa_options: Optional[Dict[str, Any]] = None
    ) -> int:
        """빠른 가상 피팅 프로세스 시작 (Redis 큐 사용)"""
        
        # 처리 상태 레코드 생성 (기존 가상 피팅과 동일)
        process = VirtualFittingProcess(
            user_id=user_id,
            status='QUEUED',  # 큐에 대기 중 상태
            started_at=datetime.now(pytz.timezone('Asia/Seoul'))
        )
        db.add(process)
        db.commit()
        db.refresh(process)
        
        # 입력 이미지 경로를 프로세스에 저장
        try:
            process.model_image_path = person_image_path
            if upper_cloth_image_path:
                process.cloth_image_path = upper_cloth_image_path
            elif lower_cloth_image_path:
                process.cloth_image_path = lower_cloth_image_path
            db.commit()
        except Exception as e:
            logger.warning(f"입력 이미지 경로 저장 실패(무시): {e}")
        
        logger.info(f"빠른 가상 피팅 프로세스 생성: {process.id}")
        
        # 작업 데이터 준비
        task_data = {
            "process_id": process.id,
            "user_id": user_id,
            "person_image_path": person_image_path,
            "upper_cloth_image_path": upper_cloth_image_path,
            "lower_cloth_image_path": lower_cloth_image_path,
            "fitting_type": fitting_type,
            "garment_description": garment_description,
            "model_type": model_type,
            "leffa_options": leffa_options
        }
        
        # Redis 큐에 작업 추가
        task_id = task_queue.enqueue_task("fast_fitting", task_data)
        
        if task_id:
            # 프로세스에 task_id 저장
            process.error_message = f"task_id:{task_id}"
            db.commit()
            logger.info(f"빠른 가상 피팅 작업이 큐에 추가됨: {task_id}")
        else:
            # 큐 추가 실패 시 상태 업데이트
            process.status = 'FAILED'
            process.error_message = "Redis 큐에 작업 추가 실패"
            db.commit()
            raise Exception("작업 큐에 추가하지 못했습니다.")
        
        return process.id
    
    def process_fast_fitting_task(self, task_data: Dict[str, Any]) -> bool:
        """빠른 가상 피팅 작업 처리 (Worker에서 호출)"""
        process_id = task_data["process_id"]
        user_id = task_data["user_id"]
        person_image_path = task_data["person_image_path"]
        upper_cloth_image_path = task_data.get("upper_cloth_image_path")
        lower_cloth_image_path = task_data.get("lower_cloth_image_path")
        fitting_type = task_data["fitting_type"]
        garment_description = task_data["garment_description"]
        model_type = task_data.get("model_type", "change-clothes")
        leffa_options = task_data.get("leffa_options")
        
        db = SessionLocal()
        
        try:
            # 프로세스 상태 조회
            process = db.query(VirtualFittingProcess).filter(
                VirtualFittingProcess.id == process_id
            ).first()
            
            if not process:
                logger.error(f"프로세스를 찾을 수 없음: {process_id}")
                return False
            
            # 상태를 PROCESSING으로 변경
            process.status = 'PROCESSING'
            db.commit()
            
            logger.info(f"빠른 가상 피팅 처리 시작: {process_id}, 타입: {fitting_type}")
            
            # 피팅 타입에 따라 처리
            if fitting_type == "상의+하의":
                # 1. 상의 피팅
                logger.info("상의 피팅 시작")
                upper_result = self._call_api(
                    person_image_path=person_image_path,
                    garment_image_path=upper_cloth_image_path,
                    category="upper_body",
                    model_type=model_type,
                    garment_description=garment_description,
                    leffa_options=leffa_options
                )
                
                # 상의 결과 저장
                upper_result_path = self._save_result_image(upper_result[0], user_id, "upper")
                
                # 2. 하의 피팅 (상의 결과 이미지를 입력으로 사용)
                logger.info("하의 피팅 시작")
                final_result = self._call_api(
                    person_image_path=upper_result[0],  # 상의 결과를 입력으로
                    garment_image_path=lower_cloth_image_path,
                    category="lower_body",
                    model_type=model_type,
                    garment_description=garment_description,
                    leffa_options=leffa_options
                )
                
                # 최종 결과 저장
                final_result_path = self._save_result_image(final_result[0], user_id, "both")
                
                # DB에 결과 저장 (1개의 최종 결과만)
                process.result_image_1 = final_result_path
                
            else:
                # 단일 피팅 (상의, 하의, 드레스)
                if upper_cloth_image_path:
                    cloth_image_path = upper_cloth_image_path
                    category_map = {"상의": "upper_body", "드레스": "dresses"}
                    category = category_map.get(fitting_type, "upper_body")
                else:
                    cloth_image_path = lower_cloth_image_path
                    category = "lower_body"
                
                logger.info(f"{fitting_type} 피팅 시작, 카테고리: {category}")
                result = self._call_api(
                    person_image_path=person_image_path,
                    garment_image_path=cloth_image_path,
                    category=category,
                    model_type=model_type,
                    garment_description=garment_description,
                    leffa_options=leffa_options
                )
                
                # 결과 저장
                result_path = self._save_result_image(result[0], user_id, fitting_type)
                
                # DB에 결과 저장
                process.result_image_1 = result_path
            
            # 상태를 COMPLETED로 변경
            process.status = 'COMPLETED'
            process.completed_at = datetime.now(pytz.timezone('Asia/Seoul'))
            db.commit()
            
            # 임시 파일 정리 (원본 person_images는 절대 삭제 금지!)
            self._cleanup_temp_files(person_image_path, upper_cloth_image_path, lower_cloth_image_path)
            
            logger.info(f"빠른 가상 피팅 완료: {process_id}")
            return True
            
        except Exception as e:
            logger.error(f"빠른 가상 피팅 처리 중 오류: {e}")
            
            # 상태를 FAILED로 변경
            process.status = 'FAILED'
            process.error_message = str(e)
            db.commit()
            
            # 오류 시에도 임시 파일 정리
            try:
                self._cleanup_temp_files(person_image_path, upper_cloth_image_path, lower_cloth_image_path)
            except:
                pass
            
            return False
        
        finally:
            db.close()
    
    def _call_api(
        self,
        person_image_path: str,
        garment_image_path: str,
        category: str,
        model_type: str,
        garment_description: str = "",
        leffa_options: Optional[Dict[str, Any]] = None
    ):
        """모델에 따라 적절한 API 호출"""
        if model_type == "leffa":
            return self._call_leffa_api(person_image_path, garment_image_path, category, leffa_options or {})
        else:
            return self._call_change_clothes_api(person_image_path, garment_image_path, category, garment_description)
    
    def _call_change_clothes_api(
        self,
        person_image_path: str,
        garment_image_path: str,
        category: str,  # "upper_body", "lower_body", "dresses"
        description: str
    ):
        """Change Clothes AI API 호출"""
        try:
            client = self.get_change_clothes_client()
            
            logger.info(f"Hugging Face API 호출: category={category}")
            logger.info(f"원본 person_image: {person_image_path}")
            logger.info(f"원본 garment_image: {garment_image_path}")
            
            # 이미지를 로컬 절대 경로로 준비
            local_person_image = self._prepare_local_image(person_image_path)
            local_garment_image = self._prepare_local_image(garment_image_path)
            
            logger.info(f"로컬 person_image: {local_person_image}")
            logger.info(f"로컬 garment_image: {local_garment_image}")
            
            # API 문서대로 정확히 호출
            # dict 파라미터는 단순 딕셔너리로 전달
            result = client.predict(
                {
                    "background": handle_file(local_person_image),
                    "layers": [],
                    "composite": None
                },
                handle_file(local_garment_image),
                description,
                True,  # is_checked
                False,  # is_checked_crop
                30,  # denoise_steps
                -1,  # seed
                category,
                api_name="/tryon"
            )
            
            logger.info(f"Hugging Face API 호출 성공, 결과 타입: {type(result)}")
            return result
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Hugging Face API 호출 실패: {error_msg}", exc_info=True)
            
            # GPU 할당량 초과 에러 처리
            if "GPU quota" in error_msg or "quota" in error_msg.lower():
                raise Exception("Hugging Face GPU 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요. (약 1시간 후 할당량이 리셋됩니다)")
            
            raise
    
    def _call_leffa_api(
        self,
        person_image_path: str,
        garment_image_path: str,
        category: str,  # "upper_body", "lower_body", "dresses"
        leffa_options: Dict[str, Any]
    ):
        """Leffa AI API 호출"""
        try:
            client = self.get_leffa_client()
            
            logger.info(f"Leffa AI API 호출: category={category}, options={leffa_options}")
            logger.info(f"원본 person_image: {person_image_path}")
            logger.info(f"원본 garment_image: {garment_image_path}")
            
            # 이미지를 로컬 절대 경로로 준비
            local_person_image = self._prepare_local_image(person_image_path)
            local_garment_image = self._prepare_local_image(garment_image_path)
            
            logger.info(f"로컬 person_image: {local_person_image}")
            logger.info(f"로컬 garment_image: {local_garment_image}")
            
            # Leffa API 호출
            logger.info("Leffa API predict 호출 시작...")
            
            # API 문서에 따라 정확히 호출 (소문자 "false" 사용!)
            result = client.predict(
                src_image_path=handle_file(local_person_image),
                ref_image_path=handle_file(local_garment_image),
                ref_acceleration="false",  # 소문자!
                step=int(leffa_options.get("steps", 30)),
                scale=float(leffa_options.get("scale", 2.5)),
                seed=int(leffa_options.get("seed", 42)),
                vt_model_type=leffa_options.get("model_type", "viton_hd"),
                vt_garment_type=category,
                vt_repaint="false",  # 소문자!
                api_name="/leffa_predict_vt"
            )
            
            logger.info(f"Leffa AI API 호출 성공!")
            logger.info(f"결과 타입: {type(result)}")
            logger.info(f"결과 길이: {len(result) if isinstance(result, (list, tuple)) else 'N/A'}")
            
            # result는 tuple of 3 elements (Generated Image, Mask, DensePose)
            # 각 요소는 dict 형식: {path: str, url: str, ...}
            if isinstance(result, (list, tuple)) and len(result) >= 1:
                first_result = result[0]
                logger.info(f"첫 번째 결과 (Generated Image) 타입: {type(first_result)}")
                
                # dict 형식이면 path 추출
                if isinstance(first_result, dict):
                    result_path = first_result.get('path') or first_result.get('url')
                    logger.info(f"이미지 경로 추출: {result_path}")
                    # Change Clothes AI와 동일한 형식으로 반환 (path, mask)
                    return (result_path, result[1].get('path') if len(result) > 1 and isinstance(result[1], dict) else None)
                else:
                    # 이미 경로 문자열이면 그대로 반환
                    return result
            
            return result
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Leffa AI API 호출 실패: {error_msg}", exc_info=True)
            
            # 구체적인 에러 메시지 생성
            if "GPU quota" in error_msg or "quota" in error_msg.lower():
                raise Exception("Leffa AI GPU 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요. (약 1시간 후 할당량이 리셋됩니다)")
            elif "Expecting value" in error_msg or "JSONDecodeError" in error_msg:
                raise Exception(
                    "Leffa AI 모델이 현재 사용 불가능합니다. "
                    "Hugging Face Space가 로드되지 않았거나 응답하지 않습니다. "
                    "잠시 후 다시 시도하거나 Change Clothes AI 모델을 사용해주세요."
                )
            elif "Space is not running" in error_msg or "503" in error_msg:
                raise Exception(
                    "Leffa AI Space가 현재 실행 중이지 않습니다. "
                    "Space가 시작될 때까지 몇 분 정도 소요될 수 있습니다. "
                    "잠시 후 다시 시도하거나 Change Clothes AI 모델을 사용해주세요."
                )
            
            # 기타 에러
            raise Exception(f"Leffa AI 처리 중 오류가 발생했습니다: {error_msg}")
    
    def _save_result_image(self, result_image_path: str, user_id: int, fitting_type: str) -> str:
        """결과 이미지를 저장하고 DB 저장용 경로 반환"""
        try:
            # 고유한 파일명 생성
            filename = f"{uuid.uuid4()}_{fitting_type}_result.png"
            output_path = self.output_dir / filename
            
            # 이미지 복사
            import shutil
            shutil.copy(result_image_path, output_path)
            
            # DB 저장용 상대 경로 반환 (uploads/virtual_fitting_results/filename.png)
            relative_path = f"uploads/virtual_fitting_results/{filename}"
            
            logger.info(f"결과 이미지 저장 완료: {relative_path}")
            return relative_path
            
        except Exception as e:
            logger.error(f"결과 이미지 저장 실패: {e}")
            raise
    
    def _cleanup_temp_files(self, person_image_path: str, upper_cloth_path: Optional[str], lower_cloth_path: Optional[str]):
        """임시 파일 정리 (temp_fitting 폴더의 파일만 삭제, person_images 원본은 절대 삭제 금지!)"""
        try:
            paths_to_check = [person_image_path, upper_cloth_path, lower_cloth_path]
            
            for path in paths_to_check:
                if not path:
                    continue
                
                # temp_fitting 폴더의 파일만 삭제
                if 'temp_fitting' in path:
                    try:
                        if os.path.exists(path):
                            os.remove(path)
                            logger.info(f"임시 파일 삭제: {path}")
                    except Exception as e:
                        logger.warning(f"임시 파일 삭제 실패: {path}, 오류: {e}")
                else:
                    logger.info(f"원본 파일 유지 (삭제 안 함): {path}")
        
        except Exception as e:
            logger.error(f"임시 파일 정리 중 오류: {e}")
    
    def get_fitting_status(self, db: Session, process_id: int, user_id: int):
        """가상 피팅 상태 조회"""
        return db.query(VirtualFittingProcess).filter(
            VirtualFittingProcess.id == process_id,
            VirtualFittingProcess.user_id == user_id
        ).first()


# 싱글톤 인스턴스
fast_fitting_service = FastFittingService()
