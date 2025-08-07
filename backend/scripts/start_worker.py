#!/usr/bin/env python3
"""
가상 피팅 워커 시작 스크립트
"""

import sys
import os
from pathlib import Path

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# 환경변수 로드
from dotenv import load_dotenv
load_dotenv()

# 워커 실행
from app.workers.virtual_fitting_worker import main

if __name__ == "__main__":
    print("가상 피팅 워커를 시작합니다...")
    main()
