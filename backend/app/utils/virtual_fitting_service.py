import os
import uuid
import asyncio
import subprocess
import sys
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import pytz
from sqlalchemy.orm import Session
from PIL import Image
import logging

from app.db.database import get_db, SessionLocal
from app.models.virtual_fitting_process import VirtualFittingProcess
from app.models.virtual_fittings import VirtualFittings
from app.crud.virtual_fitting import VirtualFittingCRUD
from app.core.task_queue import task_queue

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

env = os.environ.copy()
env.update({
    "PYTORCH_CUDA_ALLOC_CONF": "garbage_collection_threshold:0.6,max_split_size_mb:64",
    "CUDA_LAUNCH_BLOCKING": "1",     # 디버깅 정확도↑ (안정 뒤엔 빼도 됨)
    "XFORMERS_DISABLED": "0",        # 아래 3-1에서 xFormers 쓰는 모드일 때만 0
    "USE_FLASH_ATTENTION": "0",      # Flash-Attn은 끄는 걸 권장(Windows/버전빨)
})

class VirtualFittingServiceRedis:
    def __init__(self):
        # 현재 프로젝트 루트 경로
        self.project_root = Path(__file__).parent.parent.parent
        
        # OOTDiffusion 모델 경로 설정
        self.ootd_model_path = self.project_root / "app" / "api" / "ml_models" / "OOTDiffusion" / "run"
        self.output_dir = self.project_root / "uploads" / "virtual_fitting_results"
        self.temp_dir = self.project_root / "uploads" / "temp_fitting"
        
        # 디렉토리 생성
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
    
    async def start_virtual_fitting(
        self, 
        db: Session,
        user_id: int,
        model_image_path: str,
        cloth_image_path: str,
        category: int,
        model_type: str = "dc",
        scale: float = 2.0,
        samples: int = 4
    ) -> int:
        """가상 피팅 프로세스 시작 (Redis 큐 사용)"""
        
        # 처리 상태 레코드 생성
        process = VirtualFittingProcess(
            user_id=user_id,
            status='QUEUED',  # 큐에 대기 중 상태
            started_at=datetime.now(pytz.timezone('Asia/Seoul'))
        )
        db.add(process)
        db.commit()
        db.refresh(process)
        # 입력 이미지 경로를 프로세스에 저장하여 선택 페이지에서 표시 가능하도록 함
        try:
            process.model_image_path = model_image_path
            process.cloth_image_path = cloth_image_path
            db.commit()
        except Exception as e:
            logger.warning(f"입력 이미지 경로 저장 실패(무시): {e}")
        
        logger.info(f"가상 피팅 프로세스 생성: {process.id}")
        
        # 작업 데이터 준비
        task_data = {
            "process_id": process.id,
            "user_id": user_id,
            "model_image_path": model_image_path,
            "cloth_image_path": cloth_image_path,
            "category": category,
            "model_type": model_type,
            "scale": scale,
            "samples": samples
        }
        
        # Redis 큐에 작업 추가
        task_id = task_queue.enqueue_task("virtual_fitting", task_data)
        
        if task_id:
            # 프로세스에 task_id 저장 (선택사항)
            process.error_message = f"task_id:{task_id}"  # 임시로 task_id 저장
            db.commit()
            logger.info(f"작업이 큐에 추가됨: {task_id}")
        else:
            # 큐 추가 실패 시 상태 업데이트
            process.status = 'FAILED'
            process.error_message = "작업 큐 추가 실패"
            process.completed_at = datetime.now(pytz.timezone('Asia/Seoul'))
            db.commit()
            logger.error(f"작업 큐 추가 실패: {process.id}")
        
        return process.id
    
    def process_virtual_fitting_task(self, task_data: Dict[str, Any]) -> bool:
        """실제 가상 피팅 처리 (워커에서 실행)"""
        process_id = task_data["process_id"]
        
        db = SessionLocal()
        try:
            logger.info(f"가상 피팅 작업 시작: {process_id}")
            
            # 프로세스 상태를 PROCESSING으로 업데이트
            process = db.query(VirtualFittingProcess).filter(
                VirtualFittingProcess.id == process_id
            ).first()
            
            if not process:
                logger.error(f"프로세스를 찾을 수 없음: {process_id}")
                return False
            
            process.status = 'PROCESSING'
            # 입력 이미지 경로 저장 (상대/절대 혼재 가능하므로 그대로 보관)
            process.model_image_path = task_data.get("model_image_path")
            process.cloth_image_path = task_data.get("cloth_image_path")
            db.commit()
            
            # 실제 가상 피팅 실행 (메모리 이슈 대비 재시도 로직)
            base_scale = float(task_data.get("scale", 2.0))
            base_samples = int(task_data.get("samples", 4))

            attempts = [
                (base_scale, base_samples),             # 1차: 원본
                (min(base_scale, 1.5), min(base_samples, 2)),  # 2차: 스케일/샘플 감소
                (1.0, 1),                               # 3차: 최소 설정
            ]

            last_error: Optional[Exception] = None
            result_paths = None
            for scale_try, samples_try in attempts:
                try:
                    logger.info(f"가상 피팅 시도: scale={scale_try}, samples={samples_try}")
                    result_paths = self._run_ootd_diffusion(
                        task_data["model_image_path"],
                        task_data["cloth_image_path"],
                        task_data["category"],
                        task_data["model_type"],
                        scale_try,
                        samples_try
                    )
                    # 성공
                    break
                except Exception as e:
                    last_error = e
                    err_msg = str(e)
                    if "CUDA" in err_msg or "cublas" in err_msg.lower() or "out of memory" in err_msg.lower():
                        logger.warning(f"GPU 메모리 관련 오류 감지, 재시도 진행: {err_msg}")
                        continue
                    else:
                        logger.error(f"가상 피팅 실행 실패(재시도 불가 오류): {err_msg}")
                        break

            if not result_paths:
                if last_error:
                    raise last_error
                raise Exception("생성된 결과 이미지를 찾을 수 없습니다.")

            # 결과 개수를 4개로 보장 (부족 시 추가 실행 또는 중복 채움)
            if len(result_paths) < 4:
                try:
                    # 부족한 개수만큼 1씩 추가 실행하여 보충
                    missing = 4 - len(result_paths)
                    for i in range(missing):
                        extra = self._run_ootd_diffusion(
                            task_data["model_image_path"],
                            task_data["cloth_image_path"],
                            task_data["category"],
                            task_data["model_type"],
                            scale_try,
                            1
                        )
                        if extra:
                            result_paths.extend(extra[:1])
                except Exception as e:
                    logger.warning(f"추가 생성 실패, 중복으로 채움: {e}")
                # 그래도 부족하면 기존 결과 중복으로 채우기
                while len(result_paths) < 4 and result_paths:
                    result_paths.append(result_paths[-1])
            
            if not result_paths:
                raise Exception("생성된 결과 이미지를 찾을 수 없습니다.")
            
            logger.info(f"결과 이미지 {len(result_paths)}개 생성됨")
            
            # 데이터베이스 업데이트
            process.status = 'COMPLETED'
            process.completed_at = datetime.now(pytz.timezone('Asia/Seoul'))
            
            # 결과 이미지 경로 저장 (상대 경로로 저장)
            for i, relative_path in enumerate(result_paths):
                if i < 6:  # 최대 6개까지
                    # 상대 경로인지 다시 한번 확인
                    if relative_path.startswith('uploads/'):
                        setattr(process, f'result_image_{i+1}', relative_path)
                        logger.info(f"DB 저장: result_image_{i+1} = {relative_path}")
                    else:
                        # 만약 절대 경로가 들어왔다면 상대 경로로 변환
                        path_obj = Path(relative_path)
                        if 'uploads' in path_obj.parts:
                            # uploads 이후 부분만 추출
                            uploads_index = path_obj.parts.index('uploads')
                            relative_parts = path_obj.parts[uploads_index:]
                            corrected_path = '/'.join(relative_parts)
                            setattr(process, f'result_image_{i+1}', corrected_path)
                            logger.warning(f"절대 경로를 상대 경로로 수정: {relative_path} -> {corrected_path}")
                        else:
                            logger.error(f"올바르지 않은 경로 형식: {relative_path}")
            
            db.commit()
            logger.info(f"가상 피팅 완료: {process_id}")
            
            # 입력 이미지는 선택 페이지에서 미리보기를 위해 유지
            # 최종 선택 또는 취소 시 정리
            
            return True
            
        except Exception as e:
            logger.error(f"가상 피팅 처리 중 오류 발생: {e}")
            
            # 에러 발생 시 상태 업데이트
            try:
                process = db.query(VirtualFittingProcess).filter(
                    VirtualFittingProcess.id == process_id
                ).first()
                
                if process:
                    process.status = 'FAILED'
                    process.completed_at = datetime.now(pytz.timezone('Asia/Seoul'))
                    process.error_message = str(e)[:1000]
                    db.commit()
                    logger.info(f"가상 피팅 실패 상태 업데이트: {process_id}")
            except Exception as db_error:
                logger.error(f"데이터베이스 업데이트 실패: {db_error}")
            
            return False
        
        finally:
            db.close()
    
    def _run_ootd_diffusion(
        self,
        model_image_path: str,
        cloth_image_path: str,
        category: int,
        model_type: str,
        scale: float,
        samples: int
    ) -> List[str]:  # List[Path]에서 List[str]로 변경
        """OOTDiffusion 실행"""
        
        # 경로 검증
        if not self.ootd_model_path.exists():
            raise FileNotFoundError(f"OOTDiffusion 모델 경로를 찾을 수 없습니다: {self.ootd_model_path}")
        
        run_ootd_path = self.ootd_model_path / "run_ootd.py"
        if not run_ootd_path.exists():
            raise FileNotFoundError(f"run_ootd.py 파일을 찾을 수 없습니다: {run_ootd_path}")
        
        # 고유한 출력 디렉토리 생성
        unique_id = str(uuid.uuid4())
        temp_output_dir = self.temp_dir / unique_id
        temp_output_dir.mkdir(parents=True, exist_ok=True)
        
        # 절대 경로로 변환
        model_image_abs = Path(model_image_path).resolve()
        cloth_image_abs = Path(cloth_image_path).resolve()
        
        # 이미지 전처리: RGBA를 RGB로 변환
        processed_model_path = self._preprocess_image(model_image_abs, "model")
        processed_cloth_path = self._preprocess_image(cloth_image_abs, "cloth")
        
        logger.info(f"모델 이미지: {model_image_abs} -> {processed_model_path}")
        logger.info(f"의류 이미지: {cloth_image_abs} -> {processed_cloth_path}")
        
        # Python 실행 파일 경로
        python_executable = sys.executable
        
        # OOTDiffusion 실행 명령어 구성
        cmd = [
            python_executable,
            str(run_ootd_path),
            "--model_path", str(processed_model_path),
            "--cloth_path", str(processed_cloth_path),
            "--model_type", model_type,
            "--category", str(category),
            "--scale", str(scale),
            "--sample", str(samples)
        ]
        
        logger.info(f"실행 명령어: {' '.join(cmd)}")
        logger.info(f"작업 디렉토리: {self.ootd_model_path}")
        
        # subprocess 실행 (CUDA 메모리 설정 추가)
        env = os.environ.copy()
        # VRAM 파편화 완화 설정
        env.setdefault('PYTORCH_CUDA_ALLOC_CONF', 'max_split_size_mb:128,garbage_collection_threshold:0.6')
        # 일부 환경에서 xFormers 비활성화가 안정적인 경우가 있어 옵션 제공 (없으면 무시)
        # env.setdefault('XFORMERS_DISABLED', '1')

        result = subprocess.run(
            cmd,
            cwd=str(self.ootd_model_path),
            capture_output=True,
            text=True,
            timeout=1800,  # 30분 타임아웃
            shell=False,
            env=env
        )
        
        logger.info(f"subprocess 반환 코드: {result.returncode}")
        logger.info(f"stdout: {result.stdout}")
        
        if result.stderr:
            logger.warning(f"stderr: {result.stderr}")
        
        if result.returncode != 0:
            raise Exception(f"OOTDiffusion 실행 실패 (코드: {result.returncode}): {result.stderr}")
        
        # 결과 이미지들을 최종 위치로 이동
        result_paths = self._move_result_images(unique_id, model_type, samples)
        
        # 임시 디렉토리 정리
        import shutil
        shutil.rmtree(temp_output_dir, ignore_errors=True)
        
        return result_paths
    
    def _preprocess_image(self, image_path: Path, image_type: str) -> Path:
        """이미지 전처리: RGBA를 RGB로 변환"""
        try:
            # 이미지 열기
            with Image.open(image_path) as img:
                logger.info(f"{image_type} 이미지 모드: {img.mode}")
                
                # RGBA 모드인 경우 RGB로 변환
                if img.mode == 'RGBA':
                    # 흰색 배경으로 RGB 이미지 생성
                    rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                    rgb_img.paste(img, mask=img.split()[-1])  # 알파 채널을 마스크로 사용
                    
                    # 전처리된 이미지를 임시 디렉토리에 저장
                    temp_filename = f"processed_{image_type}_{uuid.uuid4().hex[:8]}.jpg"
                    temp_path = self.temp_dir / temp_filename
                    rgb_img.save(temp_path, 'JPEG', quality=95)
                    
                    logger.info(f"{image_type} 이미지 RGBA->RGB 변환 완료: {temp_path}")
                    return temp_path
                else:
                    # 이미 RGB 모드이면 원본 경로 반환
                    logger.info(f"{image_type} 이미지 이미 RGB 모드, 전처리 불필요")
                    return image_path
                    
        except Exception as e:
            logger.error(f"{image_type} 이미지 전처리 실패: {e}")
            # 전처리 실패 시 원본 경로 반환
            return image_path
    
    def _move_result_images(self, unique_id: str, model_type: str, samples: int) -> List[str]:
        """결과 이미지들을 최종 위치로 이동 (상대 경로 반환)"""
        result_paths = []
        
        # OOTDiffusion 출력 디렉토리에서 이미지 찾기
        ootd_output_dir = self.ootd_model_path / "images_output"
        
        logger.info(f"결과 이미지 검색 디렉토리: {ootd_output_dir}")
        
        for i in range(samples):
            source_path = ootd_output_dir / f"out_{model_type}_{i}.png"
            
            logger.info(f"결과 이미지 {i} 검색: {source_path}")
            
            if source_path.exists():
                # 최종 저장 경로 (절대 경로)
                filename = f"{unique_id}_result_{i}.png"
                dest_path = self.output_dir / filename
                
                # 파일 이동
                import shutil
                shutil.move(str(source_path), str(dest_path))
                
                # 상대 경로로 변환하여 저장 (DB에 저장될 경로) - 슬래시로 통일
                relative_path = f"uploads/virtual_fitting_results/{filename}"
                result_paths.append(relative_path)
                
                logger.info(f"파일 이동: {source_path} -> {dest_path}")
                logger.info(f"DB 저장용 상대 경로: {relative_path}")
                logger.info(f"절대 경로 확인: {str(dest_path)}")
            else:
                logger.warning(f"결과 이미지를 찾을 수 없음: {source_path}")
    
        logger.info(f"최종 반환할 상대 경로들: {result_paths}")
        return result_paths
    
    def _cleanup_temp_files(self, file_paths: List[str]):
        """임시 파일들 정리"""
        for file_path in file_paths:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.info(f"임시 파일 삭제: {file_path}")
            except Exception as e:
                logger.warning(f"임시 파일 삭제 실패: {e}")
    
    def get_fitting_status(self, db: Session, process_id: int, user_id: int) -> Optional[VirtualFittingProcess]:
        """가상 피팅 처리 상태 조회"""
        return db.query(VirtualFittingProcess).filter(
            VirtualFittingProcess.id == process_id,
            VirtualFittingProcess.user_id == user_id
        ).first()
    
    def select_fitting_result(
        self, 
        db: Session, 
        process_id: int, 
        user_id: int, 
        selected_image_index: int,
        title: Optional[str] = None
    ) -> Optional[VirtualFittings]:
        """가상 피팅 결과 선택 및 저장 (작업 완료 후 프로세스 레코드 삭제)"""
        
        # 처리 상태 확인
        process = self.get_fitting_status(db, process_id, user_id)
        if not process or process.status != 'COMPLETED':
            return None
        
        # 선택된 이미지 경로 가져오기 (이미 상대 경로)
        selected_image_path = getattr(process, f'result_image_{selected_image_index}', None)
        if not selected_image_path:
            return None
        
        try:
            # 선택된 이미지를 최종 저장소로 복사
            final_image_path = self._copy_selected_image_to_final_location(
                selected_image_path, user_id
            )
            
            if not final_image_path:
                logger.error("선택된 이미지 복사 실패")
                return None
            
            # 트랜잭션 시작
            # VirtualFittings 테이블에 저장 (최종 경로로 저장)
            fitting_result = VirtualFittings(
                user_id=user_id,
                fitting_image_url=final_image_path,  # 최종 저장 경로
                title=title,
                # 참고용 입력 이미지(가능하면 상대 경로로 저장)
                source_model_image_url=self._normalize_to_relative(process.model_image_path),
                source_cloth_image_url=self._normalize_to_relative(process.cloth_image_path),
                created_at=datetime.now(pytz.timezone('Asia/Seoul'))
            )
            
            db.add(fitting_result)
            db.flush()  # ID 생성을 위해 flush (commit 전)
            
            # 모든 임시 결과 이미지들 정리 (파일시스템에서 삭제)
            self._cleanup_all_process_images(process)
            
            # VirtualFittingProcess 레코드 삭제
            db.delete(process)
            
            # 모든 변경사항 커밋
            db.commit()
            
            logger.info(f"가상 피팅 결과 선택 완료 및 프로세스 삭제: process_id={process_id}, fitting_id={fitting_result.fitting_id}")
            
            return fitting_result
            
        except Exception as e:
            # 오류 발생 시 롤백
            db.rollback()
            logger.error(f"가상 피팅 결과 선택 중 오류 발생: {e}")
            return None

    def _copy_selected_image_to_final_location(self, temp_image_path: str, user_id: int) -> Optional[str]:
        """선택된 이미지를 최종 저장소로 복사"""
        try:
            # 최종 저장 디렉토리 생성
            final_dir = self.project_root / "uploads" / "selected_fittings"
            final_dir.mkdir(parents=True, exist_ok=True)
            
            # 원본 파일 경로
            source_path = self.project_root / temp_image_path
            if not source_path.exists():
                logger.error(f"원본 이미지를 찾을 수 없음: {source_path}")
                return None
            
            # 최종 파일명 생성 (사용자 ID와 타임스탬프 포함)
            import time
            timestamp = int(time.time())
            filename = f"user_{user_id}_{timestamp}_{uuid.uuid4().hex[:8]}.png"
            final_path = final_dir / filename
            
            # 파일 복사
            import shutil
            shutil.copy2(str(source_path), str(final_path))
            
            # 상대 경로 반환
            relative_final_path = f"uploads/selected_fittings/{filename}"
            
            logger.info(f"선택된 이미지 복사 완료: {source_path} -> {final_path}")
            return relative_final_path
            
        except Exception as e:
            logger.error(f"선택된 이미지 복사 실패: {e}")
            return None

    def _normalize_to_relative(self, path_str: Optional[str]) -> Optional[str]:
        if not path_str:
            return None
        try:
            p = Path(path_str)
            if 'uploads' in p.parts:
                idx = p.parts.index('uploads')
                relative = '/'.join(p.parts[idx:])
                return relative
            return path_str
        except Exception:
            return path_str

    def _cleanup_all_process_images(self, process: VirtualFittingProcess):
        """프로세스의 모든 이미지들 정리"""
        # 결과 이미지 정리
        for i in range(1, 7):  # result_image_1 ~ result_image_6
            relative_path = getattr(process, f'result_image_{i}', None)
            if relative_path:
                # 상대 경로를 절대 경로로 변환
                absolute_path = self.project_root / relative_path
                if absolute_path.exists():
                    try:
                        os.remove(str(absolute_path))
                        logger.info(f"프로세스 이미지 삭제: {absolute_path}")
                    except Exception as e:
                        logger.warning(f"프로세스 이미지 삭제 실패: {e}")
        # 입력 이미지 정리
        for p in [process.model_image_path, process.cloth_image_path]:
            if p:
                try:
                    abspath = Path(p)
                    if not abspath.is_absolute():
                        abspath = self.project_root / p
                    if abspath.exists():
                        os.remove(str(abspath))
                        logger.info(f"입력 임시 이미지 삭제: {abspath}")
                except Exception as e:
                    logger.warning(f"입력 이미지 삭제 실패: {e}")
    
    def _cleanup_unselected_images(self, process: VirtualFittingProcess, selected_index: int):
        """선택되지 않은 이미지들 정리"""
        for i in range(1, 7):  # result_image_1 ~ result_image_6
            if i != selected_index:
                relative_path = getattr(process, f'result_image_{i}', None)
                if relative_path:
                    # 상대 경로를 절대 경로로 변환
                    absolute_path = self.project_root / relative_path
                    if absolute_path.exists():
                        try:
                            os.remove(str(absolute_path))
                            logger.info(f"선택되지 않은 이미지 삭제: {absolute_path}")
                        except Exception as e:
                            logger.warning(f"이미지 삭제 실패: {e}")

# 전역 서비스 인스턴스
fitting_service_redis = VirtualFittingServiceRedis()
