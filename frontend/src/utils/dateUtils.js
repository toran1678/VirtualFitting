/**
 * 날짜 포맷팅 유틸리티 함수들
 */

/**
 * 상대적 시간 표시 (예: "방금 전", "1시간 전", "3일 전")
 * @param {string|Date} dateString - 날짜 문자열 또는 Date 객체
 * @returns {string} - 포맷된 상대 시간
 */
export const getRelativeTime = (dateString) => {
  if (!dateString) return "알 수 없음"

  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)

    // 1분 미만
    if (diffInSeconds < 60) {
      return "방금 전"
    }

    // 1시간 미만
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) {
      return `${diffInMinutes}분 전`
    }

    // 1일 미만
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) {
      return `${diffInHours}시간 전`
    }

    // 1주일 미만
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) {
      return `${diffInDays}일 전`
    }

    // 1주일 이상은 실제 날짜 표시
    return formatDate(date)
  } catch (error) {
    console.error("날짜 파싱 오류:", error)
    return "알 수 없음"
  }
}

/**
 * 날짜를 읽기 쉬운 형식으로 포맷 (예: "6월 4일 오후 10:19")
 * @param {string|Date} dateString - 날짜 문자열 또는 Date 객체
 * @returns {string} - 포맷된 날짜
 */
export const formatDate = (dateString) => {
  if (!dateString) return "알 수 없음"

  try {
    const date = new Date(dateString)
    const now = new Date()

    // 오늘인지 확인
    const isToday =
      date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()

    // 어제인지 확인
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const isYesterday =
      date.getFullYear() === yesterday.getFullYear() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getDate() === yesterday.getDate()

    const timeOptions = {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }

    const timeString = date.toLocaleString("ko-KR", timeOptions)

    if (isToday) {
      return `오늘 ${timeString}`
    } else if (isYesterday) {
      return `어제 ${timeString}`
    } else {
      // 올해인지 확인
      const isThisYear = date.getFullYear() === now.getFullYear()

      if (isThisYear) {
        const dateOptions = {
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }
        return date.toLocaleString("ko-KR", dateOptions)
      } else {
        const dateOptions = {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }
        return date.toLocaleString("ko-KR", dateOptions)
      }
    }
  } catch (error) {
    console.error("날짜 포맷팅 오류:", error)
    return "알 수 없음"
  }
}

/**
 * 간단한 날짜 포맷 (예: "2024.06.04")
 * @param {string|Date} dateString - 날짜 문자열 또는 Date 객체
 * @returns {string} - 포맷된 날짜
 */
export const formatSimpleDate = (dateString) => {
  if (!dateString) return "알 수 없음"

  try {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")

    return `${year}.${month}.${day}`
  } catch (error) {
    console.error("날짜 포맷팅 오류:", error)
    return "알 수 없음"
  }
}

/**
 * 시간만 포맷 (예: "오후 10:19")
 * @param {string|Date} dateString - 날짜 문자열 또는 Date 객체
 * @returns {string} - 포맷된 시간
 */
export const formatTime = (dateString) => {
  if (!dateString) return "알 수 없음"

  try {
    const date = new Date(dateString)
    const timeOptions = {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }

    return date.toLocaleString("ko-KR", timeOptions)
  } catch (error) {
    console.error("시간 포맷팅 오류:", error)
    return "알 수 없음"
  }
}
