import os
import redis
from typing import Optional
import json
import logging

logger = logging.getLogger(__name__)

class RedisManager:
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self._connect()
    
    def _connect(self):
        """Redis 연결 설정"""
        try:
            # 환경변수에서 Redis 설정 가져오기
            redis_url = os.getenv('REDIS_URL')
            redis_host = os.getenv('REDIS_HOST', 'localhost')
            redis_port = int(os.getenv('REDIS_PORT', 6379))
            redis_password = os.getenv('REDIS_PASSWORD')
            redis_db = int(os.getenv('REDIS_DB', 0))
            
            if redis_url:
                # Redis URL이 있는 경우 (Upstash 등)
                self.redis_client = redis.from_url(
                    redis_url,
                    decode_responses=True,
                    socket_connect_timeout=5,
                    socket_timeout=5,
                    retry_on_timeout=True
                )
            else:
                # 개별 설정으로 연결
                self.redis_client = redis.Redis(
                    host=redis_host,
                    port=redis_port,
                    password=redis_password,
                    db=redis_db,
                    decode_responses=True,
                    socket_connect_timeout=5,
                    socket_timeout=5,
                    retry_on_timeout=True
                )
            
            # 연결 테스트
            self.redis_client.ping()
            logger.info("Redis 연결 성공")
            
        except Exception as e:
            logger.error(f"Redis 연결 실패: {e}")
            self.redis_client = None
    
    def is_connected(self) -> bool:
        """Redis 연결 상태 확인"""
        if not self.redis_client:
            return False
        try:
            self.redis_client.ping()
            return True
        except:
            return False
    
    def get_client(self) -> Optional[redis.Redis]:
        """Redis 클라이언트 반환"""
        if not self.is_connected():
            self._connect()
        return self.redis_client

# 전역 Redis 매니저 인스턴스
redis_manager = RedisManager()
