/**
 * ===================================================================
 * 가상 피팅 API 클라이언트 (수정됨)
 * ===================================================================
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"

// 가상 피팅 시작
export const startVirtualFitting = async (modelImage, clothImage, category = 0, modelType = "dc", scale = 2.0, samples = 4) => {
  try {
    const formData = new FormData()
    formData.append("model_image", modelImage)
    formData.append("cloth_image", clothImage)
    formData.append("category", category.toString())
    formData.append("model_type", modelType)
    formData.append("scale", scale.toString())
    formData.append("samples", samples.toString())

    const response = await fetch(`${API_BASE_URL}/api/virtual-fitting-redis/start`, {
      method: "POST",
      credentials: "include",
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || "가상 피팅 시작에 실패했습니다.")
    }

    return await response.json()
  } catch (error) {
    console.error("가상 피팅 시작 오류:", error)
    throw error
  }
}

// 가상 피팅 상태 조회
export const getFittingStatus = async (processId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/virtual-fitting-redis/status/${processId}`, {
      credentials: "include",
    })

    if (!response.ok) {
      throw new Error("가상 피팅 상태 조회에 실패했습니다.")
    }

    return await response.json()
  } catch (error) {
    console.error("가상 피팅 상태 조회 오류:", error)
    throw error
  }
}

// 사용자의 프로세스 목록 조회 (백엔드에 이미 구현됨)
export const getUserFittingProcesses = async (status = null, page = 1, perPage = 20) => {
  try {
    let url = `${API_BASE_URL}/api/virtual-fitting-redis/processes?page=${page}&per_page=${perPage}`
    if (status) {
      url += `&status=${status}`
    }

    const response = await fetch(url, {
      credentials: "include",
    })

    if (!response.ok) {
      throw new Error("프로세스 목록 조회에 실패했습니다.")
    }

    const data = await response.json()
    return data.processes || [] // 백엔드 응답 구조에 맞게 수정
  } catch (error) {
    console.error("프로세스 목록 조회 오류:", error)
    return []
  }
}

// 가상 피팅 결과 선택
export const selectFittingResult = async (processId, selectedImageIndex) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/virtual-fitting-redis/select`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        process_id: processId,
        selected_image_index: selectedImageIndex,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || "가상 피팅 결과 선택에 실패했습니다.")
    }

    return await response.json()
  } catch (error) {
    console.error("가상 피팅 결과 선택 오류:", error)
    throw error
  }
}

// 가상 피팅 히스토리 조회
export const getFittingHistory = async (page = 1, perPage = 20) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/virtual-fitting-redis/history?page=${page}&per_page=${perPage}`, {
      credentials: "include",
    })

    if (!response.ok) {
      throw new Error("가상 피팅 히스토리 조회에 실패했습니다.")
    }

    return await response.json()
  } catch (error) {
    console.error("가상 피팅 히스토리 조회 오류:", error)
    throw error
  }
}

// 큐 정보 조회 (수정됨)
export const getQueueInfo = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/virtual-fitting-redis/queue-info`, {
      credentials: "include",
    })

    if (!response.ok) {
      throw new Error("큐 정보 조회에 실패했습니다.")
    }

    const result = await response.json()
    // 백엔드 응답: {"success": True, "data": {"queued": int, "processing": int}}
    return {
      success: result.success || false,
      queued: result.data?.queued || 0,
      processing: result.data?.processing || 0
    }
  } catch (error) {
    console.error("큐 정보 조회 오류:", error)
    return { success: false, queued: 0, processing: 0 }
  }
}

// 프로세스 취소
export const cancelFittingProcess = async (processId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/virtual-fitting-redis/process/${processId}`, {
      method: "DELETE",
      credentials: "include",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || "프로세스 취소에 실패했습니다.")
    }

    return await response.json()
  } catch (error) {
    console.error("프로세스 취소 오류:", error)
    throw error
  }
}

// 이미지 URL 생성 헬퍼 함수들
export const getProcessImageUrl = (processId, imageIndex) => {
  return `${API_BASE_URL}/api/virtual-fitting-redis/image/${processId}/${imageIndex}`
}

export const getFittingResultImageUrl = (fittingId) => {
  return `${API_BASE_URL}/api/virtual-fitting-redis/result/${fittingId}`
}
