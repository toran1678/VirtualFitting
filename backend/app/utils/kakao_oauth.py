import httpx
import logging
from typing import Dict, Any
from fastapi import HTTPException
import asyncio

logger = logging.getLogger(__name__)

class KakaoOAuth:
    def __init__(self):
        self.client_id = "3a1212c7ad4ed946e69cf4c9462b2688"
        self.redirect_uri = "http://localhost:3000/auth/kakao/callback"
        self.token_url = "https://kauth.kakao.com/oauth/token"
        self.user_info_url = "https://kapi.kakao.com/v2/user/me"
        self.auth_url = "https://kauth.kakao.com/oauth/authorize"

    def get_authorization_url(self, state: str = None, prompt: str = None) -> str:
        """카카오 OAuth 인증 URL 생성 - prompt 파라미터 지원"""
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
        }
        if state:
            params["state"] = state
        
        # prompt 파라미터 추가 (강제 로그인을 위해)
        if prompt:
            params["prompt"] = prompt
            logger.info(f"카카오 인증 URL에 prompt 파라미터 추가: {prompt}")
        
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        auth_url = f"{self.auth_url}?{query_string}"
        
        logger.info(f"생성된 카카오 인증 URL: {auth_url}")
        return auth_url

    async def get_access_token(self, authorization_code: str, retry_count: int = 0) -> Dict[str, Any]:
        """인증 코드로 액세스 토큰 획득 (재시도 로직 포함)"""
        data = {
            "grant_type": "authorization_code",
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "code": authorization_code,
        }

        logger.info(f"카카오 토큰 요청 URL: {self.token_url}")
        logger.info(f"카카오 토큰 요청 데이터: {data}")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.token_url,
                    data=data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    timeout=30.0
                )

            logger.info(f"카카오 토큰 응답 상태: {response.status_code}")
            logger.info(f"카카오 토큰 응답 헤더: {dict(response.headers)}")
            logger.info(f"카카오 토큰 응답 내용: {response.text}")

            if response.status_code == 200:
                return response.json()
            elif response.status_code == 429:
                # Rate Limit 에러 처리
                error_data = response.json() if response.text else {}
                error_code = error_data.get("error_code", "KOE237")
                
                if retry_count < 2:  # 최대 2번 재시도
                    wait_time = (retry_count + 1) * 5  # 5초, 10초 대기
                    logger.warning(f"카카오 API Rate Limit 도달. {wait_time}초 후 재시도... (시도: {retry_count + 1}/3)")
                    await asyncio.sleep(wait_time)
                    return await self.get_access_token(authorization_code, retry_count + 1)
                else:
                    logger.error(f"카카오 API Rate Limit 초과 (최대 재시도 횟수 도달)")
                    raise HTTPException(
                        status_code=429,
                        detail="카카오 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요."
                    )
            elif response.status_code == 400:
                # 잘못된 요청 처리
                error_data = response.json() if response.text else {}
                error_code = error_data.get("error_code")
                error_description = error_data.get("error_description", "알 수 없는 오류")
                
                if error_code == "KOE320":
                    raise HTTPException(
                        status_code=400,
                        detail="인증 코드가 만료되었거나 이미 사용되었습니다. 다시 로그인해주세요."
                    )
                else:
                    raise HTTPException(
                        status_code=400,
                        detail=f"카카오 인증 오류: {error_description}"
                    )
            else:
                logger.error(f"카카오 토큰 요청 실패 (상태: {response.status_code}): {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"카카오 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
                )

        except httpx.TimeoutException:
            logger.error("카카오 토큰 요청 타임아웃")
            raise HTTPException(
                status_code=408,
                detail="카카오 서버 응답 시간이 초과되었습니다. 다시 시도해주세요."
            )
        except httpx.RequestError as e:
            logger.error(f"카카오 토큰 요청 네트워크 오류: {str(e)}")
            raise HTTPException(
                status_code=503,
                detail="네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요."
            )
        except Exception as e:
            logger.error(f"카카오 토큰 요청 예외: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="카카오 로그인 처리 중 오류가 발생했습니다."
            )

    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """액세스 토큰으로 사용자 정보 조회"""
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.user_info_url,
                    headers=headers,
                    timeout=30.0
                )

            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"카카오 사용자 정보 요청 실패: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail="카카오 사용자 정보를 가져올 수 없습니다."
                )

        except httpx.TimeoutException:
            logger.error("카카오 사용자 정보 요청 타임아웃")
            raise HTTPException(
                status_code=408,
                detail="카카오 서버 응답 시간이 초과되었습니다."
            )
        except Exception as e:
            logger.error(f"카카오 사용자 정보 요청 예외: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="사용자 정보 조회 중 오류가 발생했습니다."
            )

    def extract_user_data(self, kakao_user_info: Dict[str, Any]) -> Dict[str, Any]:
        """카카오 사용자 정보에서 필요한 데이터 추출"""
        try:
            user_id = str(kakao_user_info.get("id", ""))
            properties = kakao_user_info.get("properties", {})
            kakao_account = kakao_user_info.get("kakao_account", {})
            
            # 프로필 정보
            nickname = properties.get("nickname", "")
            profile_image = properties.get("profile_image", "")
            
            # 계정 정보
            email = kakao_account.get("email", "")
            is_email_verified = kakao_account.get("is_email_verified", False)
            
            return {
                "kakao_id": user_id,
                "nickname": nickname,
                "email": email,
                "profile_picture": profile_image,
                "is_email_verified": is_email_verified
            }
        except Exception as e:
            logger.error(f"카카오 사용자 데이터 추출 오류: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="사용자 정보 처리 중 오류가 발생했습니다."
            )

# 싱글톤 인스턴스
kakao_oauth = KakaoOAuth()
