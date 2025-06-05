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
        console.log(`API 재시도 중... (${attempt}/${maxRetries})`)
      }

      return await apiCall()
    } catch (error) {
      // 마지막 시도였으면 에러 던지기
      if (attempt === maxRetries) {
        throw error
      }

      // 네트워크 오류나 타임아웃인 경우만 재시도
      if (!error.response || error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        console.log(`API 요청 실패, ${delay}ms 후 재시도...`, error)
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
