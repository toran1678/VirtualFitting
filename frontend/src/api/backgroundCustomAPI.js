import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// 배경 커스텀 처리
export const processBackgroundCustom = async (fittingId, backgroundFile) => {
  try {
    const formData = new FormData();
    formData.append('fitting_id', fittingId);
    formData.append('background_image', backgroundFile);

    const response = await axios.post(
      `${API_BASE_URL}/api/background-custom/process`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true,
      }
    );

    return response.data;
  } catch (error) {
    console.error('배경 커스텀 처리 실패:', error);
    throw error;
  }
};

// 배경 커스텀 결과 이미지 조회
export const getCustomResultImage = async (customFittingId) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/background-custom/result/${customFittingId}`,
      {
        responseType: 'blob',
        withCredentials: true,
      }
    );

    return response.data;
  } catch (error) {
    console.error('배경 커스텀 결과 이미지 조회 실패:', error);
    throw error;
  }
};

// 배경 커스텀 히스토리 조회
export const getCustomHistory = async (page = 1, perPage = 20) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/background-custom/history`,
      {
        params: {
          page,
          per_page: perPage,
        },
        withCredentials: true,
      }
    );

    return response.data;
  } catch (error) {
    console.error('배경 커스텀 히스토리 조회 실패:', error);
    throw error;
  }
};

// 기본 배경 이미지 목록 조회
export const getDefaultBackgrounds = async () => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/background-custom/backgrounds`,
      {
        withCredentials: true,
      }
    );

    return response.data;
  } catch (error) {
    console.error('기본 배경 이미지 조회 실패:', error);
    throw error;
  }
};

