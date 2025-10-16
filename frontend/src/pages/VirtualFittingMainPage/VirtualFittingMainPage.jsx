"use client"

import { useState, useContext, useEffect, useCallback, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ThemeContext } from "../../context/ThemeContext"
import Header from "../../components/Header/Header"
import Footer from "../../components/Footer/Footer"
import { Play, ImageIcon, RefreshCw, X, Eye, Download, Palette, Zap } from 'lucide-react'
import { isLoggedIn } from "../../api/auth"
import { 
  getFittingHistory, 
  getQueueInfo,
  selectFittingResult,
  getUserFittingProcesses,
  cancelFittingProcess,
  getProcessImageUrl,
  getFittingResultImageUrl
} from "../../api/virtual_fitting"
import styles from "./VirtualFittingMainPage.module.css"

const VirtualFittingMainPage = () => {
  const { darkMode } = useContext(ThemeContext)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // 상태 관리
  const [allProcesses, setAllProcesses] = useState([])
  const [savedResults, setSavedResults] = useState([])
  const [queueInfo, setQueueInfo] = useState({ queued: 0, processing: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // 모달 상태
  const [showResultModal, setShowResultModal] = useState(false)
  const [selectedProcess, setSelectedProcess] = useState(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)

  // 자동 새로고침을 위한 ref
  const intervalRef = useRef(null)
  const hasActiveProcesses = useRef(false)

  // 데이터 로드 함수 (useCallback으로 메모이제이션)
  const loadData = useCallback(async (showRefreshing = false) => {
    if (!isLoggedIn()) {
      setLoading(false)
      return
    }

    if (showRefreshing) setRefreshing(true)
    
    try {
      
      // 병렬로 데이터 로드
      const [queueData, savedData, processingData, queuedData, completedData, failedData] = await Promise.all([
        getQueueInfo(),
        getFittingHistory(1, 50),
        getUserFittingProcesses('PROCESSING', 1, 10),
        getUserFittingProcesses('QUEUED', 1, 10),
        getUserFittingProcesses('COMPLETED', 1, 10),
        getUserFittingProcesses('FAILED', 1, 10)
      ])


      // 큐 정보 설정
      setQueueInfo({
        queued: Math.max(0, Number(queueData.queued || 0)),
        processing: Math.max(0, Number(queueData.processing || 0))
      })

      // 저장된 결과 설정
      setSavedResults(savedData.fittings || [])

      // 모든 프로세스를 하나로 합치고 상태별로 정렬
      const allProcessesList = [
        ...(Array.isArray(processingData) ? processingData.map(p => ({ ...p, type: 'processing' })) : []),
        ...(Array.isArray(queuedData) ? queuedData.map(p => ({ ...p, type: 'queued' })) : []),
        ...(Array.isArray(completedData) ? completedData.map(p => ({ 
          ...p, 
          type: 'completed',
          result_images: Array.from({ length: p.result_image_count || 0 }, (_, i) => 
            getProcessImageUrl(p.process_id, i + 1)
          )
        })) : []),
        ...(Array.isArray(failedData) ? failedData.map(p => ({ ...p, type: 'failed' })) : [])
      ]

      // 시작 시간 기준으로 정렬하고 최대 4개만
      const sortedProcesses = allProcessesList
        .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))
        .slice(0, 4)

      setAllProcesses(sortedProcesses)

      // 활성 프로세스 여부 확인 (자동 새로고침 제어용)
      const hasActive = sortedProcesses.some(p => p.status === 'PROCESSING' || p.status === 'QUEUED') ||
                       queueData.queued > 0 || queueData.processing > 0
      hasActiveProcesses.current = hasActive

      
    } catch (error) {
      console.error("데이터 로드 실패:", error)
      setQueueInfo({ queued: 0, processing: 0 })
      setSavedResults([])
      setAllProcesses([])
      hasActiveProcesses.current = false
    } finally {
      setLoading(false)
      if (showRefreshing) setRefreshing(false)
    }
  }, []) // 의존성 배열을 빈 배열로 설정

  // 자동 새로고침 설정
  const setupAutoRefresh = useCallback(() => {
    // 기존 인터벌 정리
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // 새 인터벌 설정
    intervalRef.current = setInterval(() => {
      if (hasActiveProcesses.current) {
        // 자동 새로고침 실행
        loadData()
      } else {
        // 활성 프로세스가 없어 자동 새로고침 중단
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }, 10000) // 10초 간격
  }, [loadData])

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadData()
  }, [loadData])

  // 배경 커스텀 완료 후 새로고침 감지
  useEffect(() => {
    const refreshParam = searchParams.get('refresh')
    if (refreshParam === 'background-custom') {
      // 데이터 새로고침
      loadData(true)
      // URL에서 파라미터 제거
      setSearchParams({})
    }
  }, [searchParams, setSearchParams, loadData])

  // 자동 새로고침 설정 (allProcesses가 변경될 때만)
  useEffect(() => {
    if (hasActiveProcesses.current) {
      setupAutoRefresh()
    }

    // 컴포넌트 언마운트 시 인터벌 정리
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [setupAutoRefresh])

  // 새로운 가상 피팅 시작
  const handleStartNewFitting = () => {
    navigate('/virtual-fitting')
  }

  // 프로세스 클릭 처리
  const handleProcessClick = (process) => {
    if (process.status === 'COMPLETED') {
      // 결과 선택 전용 페이지로 이동
      navigate(`/virtual-fitting/select/${process.process_id}`)
    }
  }

  // 결과 선택 및 저장
  const handleSelectResult = async (imageIndex) => {
    if (!selectedProcess) return

    try {
      const result = await selectFittingResult(selectedProcess.process_id, imageIndex)
      alert('결과가 저장되었습니다!')
      setShowResultModal(false)
      setSelectedProcess(null)
      
      // 데이터 새로고침 (큐 정보도 함께 업데이트)
      await loadData()
      
      // 자동 새로고침 재설정
      setupAutoRefresh()
    } catch (error) {
      console.error("결과 선택 오류:", error)
      alert('결과 저장에 실패했습니다: ' + error.message)
    }
  }

  // 프로세스 취소 (수정됨)
  const handleCancelProcess = async (processId, event) => {
    event.stopPropagation() // 클릭 이벤트 전파 방지
    
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('정말로 이 작업을 취소하시겠습니까?')) {
      return
    }

    try {
      
      // 프로세스 취소
      await cancelFittingProcess(processId)
      
      
      // 즉시 데이터 새로고침 (큐 정보 포함)
      await loadData()
      
      // 자동 새로고침 재설정
      setupAutoRefresh()
      
      alert('작업이 취소되었습니다.')
      
    } catch (error) {
      console.error("프로세스 취소 오류:", error)
      alert('작업 취소에 실패했습니다: ' + error.message)
    }
  }

  // 수동 새로고침
  const handleManualRefresh = async () => {
    await loadData(true)
    setupAutoRefresh() // 자동 새로고침 재설정
  }

  // 상태별 아이콘 렌더링
  const getStatusIcon = (status) => {
    switch (status) {
      case 'QUEUED':
        return (
          <svg className={styles.statusIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
        )
      case 'PROCESSING':
        return (
          <svg className={`${styles.statusIcon} ${styles.spinning}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 11-6.219-8.56"/>
          </svg>
        )
      case 'COMPLETED':
        return (
          <svg className={styles.statusIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22,4 12,14.01 9,11.01"/>
          </svg>
        )
      case 'FAILED':
        return (
          <svg className={styles.statusIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        )
      default:
        return (
          <svg className={styles.statusIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
        )
    }
  }

  // 상태별 텍스트
  const getStatusText = (status) => {
    switch (status) {
      case 'QUEUED':
        return '대기 중'
      case 'PROCESSING':
        return '처리 중'
      case 'COMPLETED':
        return '결과 선택 대기'
      case 'FAILED':
        return '실패'
      default:
        return '알 수 없음'
    }
  }

  // 날짜 포맷팅 함수 (한국 시간대로 저장되므로 단순 포맷팅만)
  const formatDateTime = (dateString) => {
    const date = new Date(dateString)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hours = date.getHours()
    const minutes = date.getMinutes()
    
    const period = hours >= 12 ? '오후' : '오전'
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
    
    return `${month}월 ${day}일 ${period} ${displayHours}:${minutes.toString().padStart(2, '0')}`
  }

  // 이미지 다운로드 함수 (수정됨)
  const handleDownloadImage = async (imageUrl, filename) => {
    try {
      // 직접 링크 방식으로 다운로드 시도
      const link = document.createElement('a')
      link.href = imageUrl
      link.download = filename || `virtual-fitting-${Date.now()}.png`
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      
      // 임시로 DOM에 추가하고 클릭
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
    } catch (error) {
      console.error('이미지 다운로드 실패:', error)
      
      // 대안: 새 탭에서 이미지 열기
      try {
        window.open(imageUrl, '_blank', 'noopener,noreferrer')
      } catch (fallbackError) {
        console.error('이미지 열기도 실패:', fallbackError)
        alert('이미지 다운로드에 실패했습니다. 이미지를 우클릭하여 직접 저장해주세요.')
      }
    }
  }

  // 배경 커스텀 버튼 클릭 핸들러
  const handleBackgroundCustomClick = (e, result) => {
    e.stopPropagation() // 부모 클릭 이벤트 방지
    
    // 배경 커스텀 페이지로 이동 (소스 페이지 정보 포함)
    navigate(`/background-custom/${result.fitting_id}?source=main`)
  }

  // 이미지 미리보기 함수
  const handlePreviewImage = (imageUrl) => {
    setPreviewImage(imageUrl)
    setShowPreviewModal(true)
  }

  if (loading) {
    return (
      <div className={`${styles.virtualFittingMainPage} ${darkMode ? styles.darkMode : ""}`}>
        <Header />
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>데이터를 불러오는 중...</p>
        </div>
        <Footer />
      </div>
    )
  }

  if (!isLoggedIn()) {
    return (
      <div className={`${styles.virtualFittingMainPage} ${darkMode ? styles.darkMode : ""}`}>
        <Header />
        <div className={styles.container}>
          <div className={styles.emptyState}>
            <ImageIcon className={styles.emptyIcon} />
            <h2>로그인이 필요합니다</h2>
            <p>가상 피팅 서비스를 이용하려면 로그인해주세요.</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className={`${styles.virtualFittingMainPage} ${darkMode ? styles.darkMode : ""}`}>
      <Header />
      
      <div className={styles.container}>
        {/* 헤더 섹션 */}
        <div className={styles.headerSection}>
          <h1>가상 피팅</h1>
          <p>AI 기술로 의류를 가상으로 착용해보세요</p>
          
          <div className={styles.actionButtons}>
            <button 
              className={styles.primaryBtn}
              onClick={handleStartNewFitting}
            >
              <Play className={styles.btnIcon} />
              새로운 가상 피팅 시작
            </button>
            
            <button 
              className={styles.secondaryBtn}
              onClick={handleManualRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`${styles.btnIcon} ${refreshing ? styles.spinning : ''}`} />
              새로고침
            </button>
            
            <button 
              className={styles.leffaBtn}
              onClick={() => navigate('/leffa-test')}
            >
              <Zap className={styles.btnIcon} />
              모델 테스트
            </button>
          </div>

          {/* 큐 정보 카드 */}
          <div className={styles.queueCards}>
            <div className={styles.queueCard}>
              <div className={styles.queueCardIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
              </div>
              <div className={styles.queueCardContent}>
                <span className={styles.queueCardNumber}>{queueInfo.queued}</span>
                <span className={styles.queueCardLabel}>대기열</span>
              </div>
            </div>
            
            <div className={styles.queueCard}>
              <div className={styles.queueCardIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
              </div>
              <div className={styles.queueCardContent}>
                <span className={styles.queueCardNumber}>{queueInfo.processing}</span>
                <span className={styles.queueCardLabel}>처리 중</span>
              </div>
            </div>
          </div>

          {hasActiveProcesses.current && (
            <div className={styles.autoRefreshIndicator}>
              • 자동 새로고침 중
            </div>
          )}
        </div>

        {/* 최근 가상 피팅 작업 */}
        {allProcesses.length > 0 && (
          <section className={styles.section}>
            <h2>
              <svg className={styles.sectionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>
              최근 가상 피팅 작업 ({allProcesses.length}개)
            </h2>
            <div className={styles.processGrid}>
              {allProcesses.map((process) => (
                <div 
                  key={process.process_id} 
                  className={`${styles.processCard} ${process.status === 'COMPLETED' ? styles.clickable : ''}`}
                  onClick={() => handleProcessClick(process)}
                >
                  <div className={styles.cardHeader}>
                    {getStatusIcon(process.status)}
                    <span className={styles.statusText}>
                      {getStatusText(process.status)}
                    </span>
                    <button 
                      className={styles.cancelBtn}
                      onClick={(e) => handleCancelProcess(process.process_id, e)}
                      title="작업 취소"
                    >
                      <X className={styles.btnIcon} />
                    </button>
                  </div>
                  
                  <div className={styles.cardContent}>
                    <p className={styles.startTime}>
                      시작: {formatDateTime(process.started_at)}
                    </p>
                    {process.completed_at && (
                      <p className={styles.completedTime}>
                        완료: {formatDateTime(process.completed_at)}
                      </p>
                    )}
                    {process.error_message && (
                      <p className={styles.errorMessage}>
                        오류: {process.error_message}
                      </p>
                    )}
                    {process.status === 'COMPLETED' && (
                      <p className={styles.clickHint}>
                        클릭하여 결과 선택
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 저장된 가상 피팅 결과 */}
        <section className={styles.section}>
          <h2>
            <ImageIcon className={styles.sectionIcon} />
            저장된 가상 피팅 결과 ({savedResults.length}개)
          </h2>
          
          {savedResults.length === 0 ? (
            <div className={styles.emptyState}>
              <ImageIcon className={styles.emptyIcon} />
              <h3>저장된 결과가 없습니다</h3>
              <p>가상 피팅을 시작해보세요!</p>
            </div>
          ) : (
            <div className={styles.savedGrid}>
              {savedResults.map((result) => (
                <div key={result.fitting_id} className={styles.savedCard}>
                  <div className={styles.savedImageWrapper}>
                    <img 
                      src={getFittingResultImageUrl(result.fitting_id) || "/placeholder.svg"} 
                      alt="저장된 가상 피팅 결과"
                      className={styles.savedImage}
                      onError={(e) => {
                        console.error(`저장된 이미지 로드 실패: ${result.fitting_id}`)
                        e.target.src = "/placeholder.svg?height=200&width=150&text=이미지+로드+실패"
                      }}
                    />
                    <div className={styles.savedImageOverlay}>
                      <button 
                        className={styles.overlayBtn}
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePreviewImage(getFittingResultImageUrl(result.fitting_id))
                        }}
                        title="미리보기"
                      >
                        <Eye className={styles.btnIcon} />
                      </button>
                      <button 
                        className={styles.overlayBtn}
                        onClick={(e) => handleBackgroundCustomClick(e, result)}
                        title="배경 커스텀"
                      >
                        <Palette className={styles.btnIcon} />
                      </button>
                      <button 
                        className={styles.overlayBtn}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownloadImage(
                            getFittingResultImageUrl(result.fitting_id),
                            `virtual-fitting-${result.fitting_id}.png`
                          )
                        }}
                        title="다운로드"
                      >
                        <Download className={styles.btnIcon} />
                      </button>
                    </div>
                  </div>
                  
                  <div className={styles.savedCardContent}>
                    <p className={styles.savedDate}>
                      {formatDateTime(result.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 결과 선택 모달 */}
      {false && showResultModal && selectedProcess && (<div />)}

      {/* 이미지 미리보기 모달 */}
      {showPreviewModal && previewImage && (
        <div className={styles.previewModalOverlay} onClick={() => setShowPreviewModal(false)}>
          <div className={styles.previewModal} onClick={(e) => e.stopPropagation()}>
            <img 
              src={previewImage || "/placeholder.svg"} 
              alt="미리보기"
              className={styles.previewImage}
              onError={(e) => {
                console.error(`미리보기 이미지 로드 실패: ${previewImage}`)
                e.target.src = "/placeholder.svg?height=400&width=300&text=이미지+로드+실패"
              }}
            />
            <button 
              className={styles.previewCloseBtn}
              onClick={() => setShowPreviewModal(false)}
              title="닫기"
            >
              <X className={styles.btnIcon} />
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}

export default VirtualFittingMainPage
