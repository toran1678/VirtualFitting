import time
import signal
import sys
import logging
from typing import Dict, Any

from app.core.task_queue import task_queue
from app.utils.virtual_fitting_service import fitting_service_redis

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class VirtualFittingWorker:
    def __init__(self):
        self.running = True
        self.setup_signal_handlers()
    
    def setup_signal_handlers(self):
        """시그널 핸들러 설정"""
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
    
    def signal_handler(self, signum, frame):
        """종료 시그널 처리"""
        logger.info(f"종료 시그널 수신: {signum}")
        self.running = False
    
    def process_task(self, task: Dict[str, Any]) -> bool:
        """작업 처리"""
        task_type = task.get("type")
        task_id = task.get("id")
        
        logger.info(f"작업 처리 시작: {task_id} (타입: {task_type})")
        
        try:
            if task_type == "virtual_fitting":
                # 가상 피팅 작업 처리
                success = fitting_service_redis.process_virtual_fitting_task(task["data"])
                
                if success:
                    task_queue.update_task_status(task_id, "COMPLETED")
                    logger.info(f"작업 완료: {task_id}")
                else:
                    task_queue.update_task_status(task_id, "FAILED", {"error": "처리 실패"})
                    logger.error(f"작업 실패: {task_id}")
                
                return success
            else:
                logger.warning(f"알 수 없는 작업 타입: {task_type}")
                task_queue.update_task_status(task_id, "FAILED", {"error": "알 수 없는 작업 타입"})
                return False
                
        except Exception as e:
            logger.error(f"작업 처리 중 오류 발생: {e}")
            task_queue.update_task_status(task_id, "FAILED", {"error": str(e)})
            return False
    
    def run(self):
        """워커 실행"""
        logger.info("가상 피팅 워커 시작")
        
        while self.running:
            try:
                # 큐에서 작업 가져오기 (10초 타임아웃)
                task = task_queue.dequeue_task(timeout=10)
                
                if task:
                    self.process_task(task)
                else:
                    # 작업이 없으면 잠시 대기
                    time.sleep(1)
                    
            except KeyboardInterrupt:
                logger.info("키보드 인터럽트로 종료")
                break
            except Exception as e:
                logger.error(f"워커 실행 중 오류: {e}")
                time.sleep(5)  # 오류 발생 시 5초 대기
        
        logger.info("가상 피팅 워커 종료")

def main():
    """워커 메인 함수"""
    worker = VirtualFittingWorker()
    worker.run()

if __name__ == "__main__":
    main()
