/**
 * ===================================================================
 * API 유틸리티 함수
 * ===================================================================
 *
 * 주요 기능:
 * - API 요청 재시도 로직 (지수 백오프)
 * - 네트워크 오류 및 타임아웃 처리
 * - 안정적인 API 통신 보장
 *
 * 기술 스택:
 * - 재시도 전략: 지수 백오프 (Exponential Backoff)
 * - 오류 분류: 네트워크 오류 vs 서버 응답 오류
 *
 * 사용 예시:
 * - followSystem.js에서 팔로우 API 호출 시
 * - userProfiles.js에서 프로필 조회 시
 * - 네트워크가 불안정한 환경에서의 안정적인 API 통신
 *
 * 재시도 조건:
 * - 네트워크 연결 오류 (ECONNABORTED)
 * - 타임아웃 오류
 * - 서버 응답이 없는 경우
 *
 * 재시도 제외:
 * - 4xx, 5xx HTTP 상태 코드 (서버 응답이 있는 오류)
 * ===================================================================
 */

/**
 * API 요청 재시도 함수
 * @param {Function} apiCall - API 호출 함수
 * @param {number} maxRetries - 최대 재시도 횟수
 * @param {number} delay - 재시도 간 지연 시간(ms)
 * @returns {Promise} - API 응답
 */
export const retryApiCall = async (apiCall, maxRetries = 2, delay = 1000) => {

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // 첫 시도가 아니면 로그 출력
      if (attempt > 0) {
      }

      return await apiCall()
    } catch (error) {
      // 마지막 시도였으면 에러 던지기
      if (attempt === maxRetries) {
        throw error
      }

      // 네트워크 오류나 타임아웃인 경우만 재시도
      if (!error.response || error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        const currentDelay = delay;
        await new Promise((resolve) => setTimeout(resolve, currentDelay));
        // 다음 재시도에서 지연 시간 증가 (지수 백오프)
        delay = delay * 1.5
      } else {
        // 서버 응답이 있는 오류(400, 500 등)는 바로 에러 던지기
        throw error
      }
    }
  }
}
