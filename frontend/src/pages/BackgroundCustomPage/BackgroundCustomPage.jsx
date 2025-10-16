import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { isLoggedIn } from '../../api/auth';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import styles from './BackgroundCustomPage.module.css';

const BackgroundCustomPage = () => {
  const { fittingId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef(null);
  
  // 소스 페이지 정보 가져오기
  const sourcePage = searchParams.get('source') || 'main';
  
  const [originalImage, setOriginalImage] = useState(null);
  const [backgrounds, setBackgrounds] = useState([]);
  const [selectedBackground, setSelectedBackground] = useState(null);
  const [customBackground, setCustomBackground] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState('');
  const [backgroundPage, setBackgroundPage] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const [colorPage, setColorPage] = useState(0);
  const [isColorSliding, setIsColorSliding] = useState(false);
  const [backgroundType, setBackgroundType] = useState('image'); // 'image' or 'color'
  const [selectedColor, setSelectedColor] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customColor, setCustomColor] = useState('#FFFFFF');
  const [backgroundHistory, setBackgroundHistory] = useState([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [recentCustomBackgrounds, setRecentCustomBackgrounds] = useState([]); // 최근 사용한 커스텀 배경 3개

  // 배경 색상 옵션
  const backgroundColors = [
    { name: '커스텀', value: '#FFFFFF', isCustom: true },
    { name: '', value: '#000000' },
    { name: '', value: '#808080' },
    { name: '', value: '#FF0000' },
    { name: '', value: '#0000FF' },
    { name: '', value: '#00FF00' },
    { name: '', value: '#FFFF00' },
    { name: '', value: '#800080' },
    { name: '', value: '#FFA500' },
    { name: '', value: '#FFC0CB' },
    { name: '', value: '#A52A2A' },
    { name: '', value: '#87CEEB' }
  ];

  useEffect(() => {
    // 로그인 상태 확인
    if (!isLoggedIn()) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }
    
    fetchOriginalImage();
    fetchDefaultBackgrounds();
    fetchRecentCustomBackgrounds();
    if (fittingId) {
      fetchBackgroundHistory(fittingId);
    }
  }, [fittingId, navigate]);

  const fetchBackgroundHistory = async (fittingId) => {
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await axios.get(`${API_BASE_URL}/api/background-custom/history/${fittingId}`, {
        withCredentials: true,
      });

      if (response.data.success) {
        setBackgroundHistory(response.data.history || []);
      } else {
        console.error('배경 커스텀 히스토리 조회 실패:', response.data.message);
        setBackgroundHistory([]);
      }
    } catch (error) {
      console.error('배경 커스텀 히스토리 조회 실패:', error);
      if (error.response) {
        console.error('응답 상태:', error.response.status);
        console.error('응답 데이터:', error.response.data);
      }
      setBackgroundHistory([]);
    }
  };

  const fetchRecentCustomBackgrounds = async () => {
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await axios.get(`${API_BASE_URL}/api/background-custom/recent-customs`, {
        withCredentials: true,
      });

      if (response.data.success) {
        setRecentCustomBackgrounds(response.data.custom_backgrounds || []);
      } else {
        console.error('최근 커스텀 배경 조회 실패:', response.data.message);
        setRecentCustomBackgrounds([]);
      }
    } catch (error) {
      console.error('최근 커스텀 배경 조회 실패:', error);
      setRecentCustomBackgrounds([]);
    }
  };

  const fetchOriginalImage = async () => {
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      
      // 현재 이미지 (배경 커스텀된 이미지) 로드
      const historyResponse = await axios.get(`${API_BASE_URL}/api/virtual-fitting-redis/history`, {
        params: { page: 1, per_page: 50 },
        withCredentials: true
      });
      
      const targetFitting = historyResponse.data.fittings.find(fitting => fitting.fitting_id === parseInt(fittingId));
      
      if (targetFitting) {
        // 현재 이미지를 미리보기로 설정 (캐시 버스팅 추가)
        const currentImageUrl = `${API_BASE_URL}${targetFitting.image_url}?t=${Date.now()}`;
        setPreviewImage(currentImageUrl);
        
        // 원본 이미지 로드
        try {
          const originalResponse = await axios.get(`${API_BASE_URL}/api/virtual-fitting-redis/original-image/${fittingId}`, {
            withCredentials: true
          });
          
          if (originalResponse.data.original_image_url) {
            const originalImageUrl = `${API_BASE_URL}${originalResponse.data.original_image_url}`;
            setOriginalImage(originalImageUrl);
            console.log('원본 이미지 로드 성공:', originalImageUrl);
          }
        } catch (originalError) {
          console.log('원본 이미지 로드 실패, 현재 이미지를 원본으로 사용합니다.');
          // 원본 이미지 로드 실패 시 현재 이미지를 원본으로 사용
          setOriginalImage(currentImageUrl);
        }
      } else {
        throw new Error('가상피팅 결과를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('이미지 로드 실패:', error);
      setError(`이미지를 불러올 수 없습니다. (${error.response?.status || 'Unknown'})`);
    }
  };

  const fetchDefaultBackgrounds = async () => {
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await axios.get(`${API_BASE_URL}/api/background-custom/backgrounds`, {
        withCredentials: true
      });
      
      // URL을 절대 경로로 변환
      const backgroundsWithAbsoluteUrl = (response.data.backgrounds || []).map(bg => ({
        ...bg,
        url: bg.url.startsWith('http') ? bg.url : `${API_BASE_URL}${bg.url}`
      }));
      
      setBackgrounds(backgroundsWithAbsoluteUrl);
    } catch (error) {
      console.error('기본 배경 이미지 로드 실패:', error);
    }
  };


  const handleBackgroundSelect = async (background) => {
    setSelectedBackground(background);
    setCustomBackground(null);
    setSelectedHistoryItem(null);
    
    console.log('선택된 배경 이미지:', background);
    // 즉시 미리보기 생성
    await processBackgroundCustomPreview(background.url);
  };

  const handleCustomBackgroundUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageUrl = e.target.result;
        setCustomBackground({
          file: file,
          url: imageUrl,
          name: file.name
        });
        setSelectedBackground(null);
        setSelectedColor(null);
        setSelectedHistoryItem(null);
        setBackgroundType('image');
        
        // 즉시 미리보기 생성
        await processBackgroundCustomPreview(imageUrl, file);
      };
      reader.readAsDataURL(file);
    }
  };

  const processBackgroundCustomPreview = async (backgroundUrl, backgroundFile = null) => {
    if (!originalImage) {
      setError('원본 이미지를 먼저 로드해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('fitting_id', fittingId);
      formData.append('preview_only', 'true'); // 미리보기 전용 플래그
      
      if (backgroundFile) {
        // 커스텀 배경 파일
        formData.append('background_image', backgroundFile);
      } else {
        // 기본 배경 이미지 또는 최근 배경 이미지 경로 전달
        const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
        let backgroundPath = backgroundUrl;
        
        // 절대 URL인 경우 상대 경로로 변환
        if (backgroundUrl.startsWith(API_BASE_URL)) {
          backgroundPath = backgroundUrl.replace(API_BASE_URL, '');
        }
        
        console.log('배경 이미지 URL:', backgroundUrl);
        console.log('변환된 배경 이미지 경로:', backgroundPath);
        formData.append('background_path', backgroundPath);
      }

      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await axios.post(`${API_BASE_URL}/api/background-custom/preview`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true,
      });

      if (response.data.success) {
        // Base64 데이터 URL을 직접 사용
        setPreviewImage(response.data.image_url);
        
        // 성공 메시지
        console.log('미리보기 생성 완료:', response.data.message);
      } else {
        setError(response.data.message || '미리보기 생성 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('미리보기 생성 실패:', error);
      setError('미리보기 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleColorSelect = (color) => {
    if (color.isCustom) {
      setShowColorPicker(true);
      return;
    }
    
    setSelectedColor(color);
    setSelectedBackground(null);
    setCustomBackground(null);
    setSelectedHistoryItem(null);
    setBackgroundType('color');
    
    // 색상 배경으로 미리보기 생성
    processColorBackgroundPreview(color.value);
  };

  const handleCustomColorSelect = (colorValue) => {
    const customColorObj = { name: '커스텀', value: colorValue, isCustom: true };
    setSelectedColor(customColorObj);
    setSelectedBackground(null);
    setCustomBackground(null);
    setSelectedHistoryItem(null);
    setBackgroundType('color');
    setShowColorPicker(false);
    
    // 색상 배경으로 미리보기 생성
    processColorBackgroundPreview(colorValue);
  };

  const handleHistoryClick = (historyItem) => {
    // 히스토리 이미지를 미리보기에 표시
    setPreviewImage(historyItem.image_url);
    setSelectedBackground(null);
    setCustomBackground(null);
    setSelectedColor(null);
    setSelectedHistoryItem(historyItem);
    setBackgroundType('history');
    
    // 히스토리 아이템의 제목을 입력 필드에 설정
    setTitle(historyItem.title || '');
    
    // 에러 메시지 초기화
    setError(null);
  };

  const handleRecentBackgroundClick = async (recentBackground) => {
    // 최근 배경 이미지를 선택
    setCustomBackground(recentBackground);
    setSelectedBackground(null);
    setSelectedColor(null);
    setSelectedHistoryItem(null);
    setBackgroundType('image');
    
    // 에러 메시지 초기화
    setError(null);
    
    // 즉시 미리보기 생성 (파일 경로 사용)
    // Use file_path if available, otherwise use url
    const backgroundPath = recentBackground.file_path || recentBackground.url;
    await processBackgroundCustomPreview(backgroundPath);
  };

  const processColorBackgroundPreview = async (colorValue) => {
    if (!originalImage) {
      setError('원본 이미지를 먼저 로드해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('fitting_id', fittingId);
      formData.append('preview_only', 'true');
      formData.append('background_color', colorValue);

      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await axios.post(`${API_BASE_URL}/api/background-custom/preview`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true,
      });

      if (response.data.success) {
        // Base64 데이터 URL을 직접 사용
        setPreviewImage(response.data.image_url);
      } else {
        setError(response.data.message || '미리보기 생성 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('색상 배경 미리보기 생성 실패:', error);
      setError('색상 배경 미리보기 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyBackground = async () => {
    if (!selectedBackground && !customBackground && !selectedColor && !selectedHistoryItem) {
      setError('배경을 선택해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('fitting_id', fittingId);
      formData.append('title', title || '배경 커스텀 결과');
      
      if (customBackground) {
        // Check if this is a newly uploaded file or a recent background
        if (customBackground.file) {
          // Newly uploaded file
          formData.append('background_image', customBackground.file);
        } else {
          // Recent background - use file_path
          const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
          let backgroundPath = customBackground.file_path || customBackground.url;
          
          // Convert absolute URL to relative path if needed
          if (backgroundPath.startsWith(API_BASE_URL)) {
            backgroundPath = backgroundPath.replace(API_BASE_URL, '');
          }
          
          console.log('Recent background URL:', customBackground.url);
          console.log('Recent background path:', backgroundPath);
          formData.append('background_path', backgroundPath);
        }
      } else if (selectedBackground) {
        // 기본 배경 이미지 경로 전달
        const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
        let backgroundPath = selectedBackground.url;
        
        // 절대 URL인 경우 상대 경로로 변환
        if (selectedBackground.url.startsWith(API_BASE_URL)) {
          backgroundPath = selectedBackground.url.replace(API_BASE_URL, '');
        }
        
        console.log('저장용 기본 배경 이미지 URL:', selectedBackground.url);
        console.log('저장용 변환된 배경 이미지 경로:', backgroundPath);
        formData.append('background_path', backgroundPath);
      } else if (selectedColor) {
        // 색상 배경 전달
        formData.append('background_color', selectedColor.value);
      } else if (selectedHistoryItem) {
        // 히스토리 아이템 사용
        formData.append('history_id', selectedHistoryItem.custom_fitting_id);
      }

      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await axios.post(`${API_BASE_URL}/api/background-custom/process`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true,
      });

        if (response.data.success) {
          alert('배경 커스텀이 완료되었습니다!');
          
          // 저장된 이미지로 미리보기 업데이트
          const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
          const updatedImageUrl = `${API_BASE_URL}/api/virtual-fitting-redis/result/${fittingId}?t=${Date.now()}`;
          setPreviewImage(updatedImageUrl);
          
          // 소스 페이지에 따라 적절한 페이지로 이동 (새로고침 파라미터 추가)
          if (sourcePage === 'mypage') {
            navigate('/mypage?refresh=background-custom');
          } else {
            navigate('/virtual-fitting-main?refresh=background-custom');
          }
        }
    } catch (error) {
      console.error('배경 커스텀 실패:', error);
      setError('배경 커스텀 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(-1); // 이전 페이지로 이동
  };

  const handleDeleteHistory = async (historyId) => {
    if (!window.confirm('이 히스토리를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await axios.delete(`${API_BASE_URL}/api/background-custom/history/${historyId}`, {
        withCredentials: true,
      });

        if (response.data.success) {
          alert('히스토리가 삭제되었습니다.');
          // 선택된 히스토리 아이템이 삭제된 경우 선택 해제
          if (selectedHistoryItem && selectedHistoryItem.custom_fitting_id === historyId) {
            setSelectedHistoryItem(null);
            setPreviewImage(null);
          }
          // 히스토리 다시 로드
          fetchBackgroundHistory(fittingId);
        }
    } catch (error) {
      console.error('히스토리 삭제 실패:', error);
      alert('히스토리 삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.title}>배경 커스텀</h1>
          <button className={styles.closeButton} onClick={handleCancel}>
            ✕
          </button>
        </div>

      <div className={styles.content}>
        <div className={styles.leftPanel}>
          <div className={styles.previewContainer}>
            <h3 className={styles.sectionTitle}>미리보기</h3>
            {loading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>배경 커스텀 처리 중...</p>
              </div>
            ) : previewImage ? (
              <img 
                src={previewImage} 
                alt="미리보기" 
                className={styles.previewImage}
              />
            ) : (
              <div className={styles.noImageContainer}>
                <p>배경을 선택하면 미리보기가 표시됩니다</p>
              </div>
            )}

            {/* 배경 커스텀 히스토리 */}
            {backgroundHistory.length > 0 && (
              <div className={styles.historyContainer}>
                <h3 className={styles.sectionTitle}>배경 커스텀 기록</h3>
                <div className={styles.historyGrid}>
                  {backgroundHistory.map((item, index) => (
                      <div 
                        key={index} 
                        className={`${styles.historyItem} ${
                          selectedHistoryItem?.custom_fitting_id === item.custom_fitting_id ? styles.selected : ''
                        }`}
                      >
                      <div className={styles.historyItemContent} onClick={() => handleHistoryClick(item)}>
                        <img 
                          src={item.image_url} 
                          alt={item.title}
                          className={styles.historyImage}
                        />
                        <div className={styles.historyInfo}>
                          <p className={styles.historyTitle}>{item.title}</p>
                          <p className={styles.historyDate}>
                            {new Date(item.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button 
                        className={styles.deleteButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteHistory(item.custom_fitting_id);
                          }}
                        title="삭제"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.rightPanel}>
          <div className={styles.backgroundSection}>
            <h3 className={styles.sectionTitle}>배경 선택</h3>
            
            {/* 배경 타입 탭 */}
            <div className={styles.backgroundTabs}>
              <button 
                className={`${styles.tabButton} ${backgroundType === 'image' ? styles.active : ''}`}
                onClick={() => setBackgroundType('image')}
              >
                기본 배경
              </button>
              <button 
                className={`${styles.tabButton} ${backgroundType === 'color' ? styles.active : ''}`}
                onClick={() => setBackgroundType('color')}
              >
                배경 색상
              </button>
            </div>
            
            {/* 기본 배경 이미지들 */}
            {backgroundType === 'image' && (
            <div className={styles.defaultBackgrounds}>
              <div className={styles.backgroundSlider}>
                <button 
                  className={styles.slideButton}
                  onClick={() => {
                    if (backgroundPage > 0) {
                      setIsSliding(true);
                      setTimeout(() => {
                        setBackgroundPage(prev => prev - 1);
                        setIsSliding(false);
                      }, 200);
                    }
                  }}
                  disabled={backgroundPage === 0}
                >
                  ‹
                </button>
                <div className={`${styles.backgroundGrid} ${isSliding ? styles.sliding : ''}`}>
                  {backgrounds.slice(backgroundPage * 4, (backgroundPage + 1) * 4).map((bg, index) => (
                    <div
                      key={index}
                      className={`${styles.backgroundItem} ${
                        selectedBackground?.url === bg.url ? styles.selected : ''
                      }`}
                      onClick={() => handleBackgroundSelect(bg)}
                    >
                      <img 
                        src={bg.url} 
                        alt={bg.filename}
                        className={styles.backgroundImage}
                      />
                    </div>
                  ))}
                </div>
                <button 
                  className={styles.slideButton}
                  onClick={() => {
                    const maxPage = Math.ceil(backgrounds.length / 4) - 1;
                    if (backgroundPage < maxPage) {
                      setIsSliding(true);
                      setTimeout(() => {
                        setBackgroundPage(prev => prev + 1);
                        setIsSliding(false);
                      }, 200);
                    }
                  }}
                  disabled={backgroundPage >= Math.ceil(backgrounds.length / 4) - 1}
                >
                  ›
                </button>
              </div>
            </div>
            )}

            {/* 배경 색상 선택 */}
            {backgroundType === 'color' && (
            <div className={styles.colorBackgrounds}>
              <div className={styles.colorSlider}>
                <button 
                  className={styles.slideButton}
                  onClick={() => {
                    if (colorPage > 0) {
                      setIsColorSliding(true);
                      setTimeout(() => {
                        setColorPage(prev => prev - 1);
                        setIsColorSliding(false);
                      }, 200);
                    }
                  }}
                  disabled={colorPage === 0}
                >
                  ‹
                </button>
                <div className={`${styles.colorGrid} ${isColorSliding ? styles.sliding : ''}`}>
                  {backgroundColors.slice(colorPage * 4, (colorPage + 1) * 4).map((color, index) => (
                    <div
                      key={index}
                      className={`${styles.colorItem} ${
                        selectedColor?.value === color.value ? styles.selected : ''
                      }`}
                      onClick={() => handleColorSelect(color)}
                      style={{ backgroundColor: color.value }}
                    >
                      {color.isCustom ? (
                        <div className={styles.colorPickerIcon}>🎨</div>
                      ) : (
                        <span className={styles.colorName}>{color.name}</span>
                      )}
                    </div>
                  ))}
                </div>
                <button 
                  className={styles.slideButton}
                  onClick={() => {
                    const maxPage = Math.ceil(backgroundColors.length / 4) - 1;
                    if (colorPage < maxPage) {
                      setIsColorSliding(true);
                      setTimeout(() => {
                        setColorPage(prev => prev + 1);
                        setIsColorSliding(false);
                      }, 200);
                    }
                  }}
                  disabled={colorPage >= Math.ceil(backgroundColors.length / 4) - 1}
                >
                  ›
                </button>
              </div>
            </div>
            )}

            {/* 커스텀 배경 업로드 */}
            {backgroundType === 'image' && (
            <div className={styles.customBackground}>
              <h4 className={styles.subtitle}>사용자 배경</h4>
              <div className={styles.uploadArea}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCustomBackgroundUpload}
                  style={{ display: 'none' }}
                />
                <div className={styles.backgroundGrid} style={{ gap: '24px', padding: '16px' }}>
                  {/* 첫 번째 칸: 업로드 버튼 */}
                  <div
                    className={styles.backgroundItem}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      backgroundColor: 'var(--bg-secondary)', 
                      border: '2px dashed var(--border-color)',
                      borderRadius: '12px',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.borderColor = 'var(--accent-color)';
                      e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderColor = 'var(--border-color)';
                      e.target.style.backgroundColor = 'var(--bg-secondary)';
                    }}
                  >
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                      <div style={{ fontSize: '28px', marginBottom: '8px', fontWeight: '300' }}>+</div>
                      <div style={{ fontSize: '13px', fontWeight: '500' }}>업로드</div>
                    </div>
                  </div>
                  
                  {/* 최근 커스텀 배경 3개 */}
                  {recentCustomBackgrounds.slice(0, 3).map((bg, index) => (
                    <div
                      key={index}
                      className={`${styles.backgroundItem} ${
                        customBackground?.id === bg.id ? styles.selected : ''
                      }`}
                      onClick={() => handleRecentBackgroundClick(bg)}
                    >
                      <img 
                        src={bg.url} 
                        alt={bg.name}
                        className={styles.backgroundImage}
                      />
                    </div>
                  ))}
                </div>
                
                {customBackground && (
                  <div className={styles.customPreview}>
                    <img 
                      src={customBackground.url} 
                      alt="커스텀 배경"
                      className={styles.customImage}
                    />
                    <p className={styles.customName}>{customBackground.name}</p>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* 색상 팔레트 모달 */}
            {showColorPicker && (
              <div className={styles.colorPickerModal}>
                <div className={styles.colorPickerContent}>
                  <div className={styles.colorPickerHeader}>
                    <h4 className={styles.colorPickerTitle}>색상 선택</h4>
                    <button 
                      className={styles.colorPickerClose}
                      onClick={() => setShowColorPicker(false)}
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className={styles.colorPickerMain}>
                    {/* 현재 선택된 색상 미리보기 */}
                    <div className={styles.colorPreview}>
                      <div 
                        className={styles.colorPreviewCircle}
                        style={{ backgroundColor: customColor }}
                      ></div>
                      <span className={styles.colorPreviewText}>{customColor}</span>
                    </div>
                    
                    {/* 색상 선택기 */}
                    <div className={styles.colorPickerWrapper}>
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        className={styles.colorInput}
                      />
                    </div>
                    
                    {/* HEX 코드 입력 */}
                    <div className={styles.hexInputWrapper}>
                      <label className={styles.hexLabel}>HEX</label>
                      <input
                        type="text"
                        value={customColor}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                            setCustomColor(value);
                          }
                        }}
                        className={styles.hexInput}
                        placeholder="#000000"
                        maxLength={7}
                      />
                    </div>
                    
                    {/* 프리셋 색상 팔레트 */}
                    <div className={styles.presetColors}>
                      {[
                        '#FF0000', '#FF69B4', '#800080', '#0000FF', '#87CEEB',
                        '#00FFFF', '#008000', '#90EE90', '#FFFF00', '#FFA500',
                        '#FFB6C1', '#FFD700', '#FF6347', '#8B4513', '#808080',
                        '#C0C0C0', '#000000', '#FFFFFF', '#FF1493', '#32CD32'
                      ].map((color, index) => (
                        <div
                          key={index}
                          className={styles.presetColorItem}
                          style={{ backgroundColor: color }}
                          onClick={() => setCustomColor(color)}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className={styles.colorPickerActions}>
                    <button
                      className={styles.colorPickerCancel}
                      onClick={() => setShowColorPicker(false)}
                    >
                      취소
                    </button>
                    <button
                      className={styles.colorPickerApply}
                      onClick={() => handleCustomColorSelect(customColor)}
                    >
                      적용
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 제목 입력 */}
          <div className={styles.titleSection}>
            <h4 className={styles.subtitle}>제목</h4>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="배경 커스텀 결과 제목을 입력하세요"
              className={styles.titleInput}
              maxLength={50}
            />
          </div>

          {/* 액션 버튼들 */}
          <div className={styles.actionButtons}>
            <button 
              className={styles.cancelButton}
              onClick={handleCancel}
              disabled={loading}
            >
              닫기
            </button>
            <button 
              className={styles.saveButton}
              onClick={handleApplyBackground}
              disabled={loading || (!selectedBackground && !customBackground && !selectedColor && !selectedHistoryItem)}
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>

          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}
        </div>
      </div>
      </div>
      <Footer />
    </>
  );
};

export default BackgroundCustomPage;
