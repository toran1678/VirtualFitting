/**
 * ===================================================================
 * 의류 좋아요 관리 API
 * ===================================================================
 *
 * 주요 기능:
 * - 의류 아이템 좋아요/좋아요 취소 토글
 * - 사용자가 좋아요한 의류 목록 조회
 * - 특정 의류의 좋아요 상태 확인
 * - 좋아요한 의류 ID 목록 조회
 *
 * 기술 스택:
 * - 인증: 세션 쿠키 기반
 *
 * 사용 예시:
 * - 의류 상세 페이지에서 하트 버튼 클릭
 * - 마이페이지에서 좋아요한 의류 목록 표시
 * - 의류 브라우징 시 좋아요 상태 표시
 * ===================================================================
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"

// 좋아요 토글
export const toggleClothingLike = async (clothingId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/liked-clothes/toggle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // 세션 쿠키 포함
      body: JSON.stringify({
        clothing_id: clothingId,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || "좋아요 처리에 실패했습니다.")
    }

    return await response.json()
  } catch (error) {
    console.error("좋아요 토글 오류:", error)
    throw error
  }
}

// 내가 좋아요한 의류 목록 조회
export const getMyLikedClothes = async (skip = 0, limit = 100) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/liked-clothes/my-likes?skip=${skip}&limit=${limit}`, {
      credentials: "include", // 세션 쿠키 포함
    })

    if (!response.ok) {
      throw new Error("좋아요한 의류 목록을 불러오는데 실패했습니다.")
    }

    return await response.json()
  } catch (error) {
    console.error("좋아요한 의류 목록 조회 오류:", error)
    throw error
  }
}

// 특정 의류의 좋아요 상태 확인
export const checkClothingLikeStatus = async (clothingId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/liked-clothes/check/${clothingId}`, {
      credentials: "include", // 세션 쿠키 포함
    })

    if (!response.ok) {
      throw new Error("좋아요 상태 확인에 실패했습니다.")
    }

    return await response.json()
  } catch (error) {
    console.error("좋아요 상태 확인 오류:", error)
    throw error
  }
}

// 내가 좋아요한 의류 ID 목록 조회
export const getMyLikedClothingIds = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/liked-clothes/my-liked-ids`, {
      credentials: "include", // 세션 쿠키 포함
    })

    if (!response.ok) {
      throw new Error("좋아요한 의류 ID 목록을 불러오는데 실패했습니다.")
    }

    const data = await response.json()
    return data.liked_clothing_ids || []
  } catch (error) {
    console.error("좋아요한 의류 ID 목록 조회 오류:", error)
    return []
  }
}
