"use client"

import { useState } from "react"
import { useAuth } from "../context/AuthContext"

export const useLoginForm = () => {
  const { login } = useAuth()
  const [formData, setFormData] = useState({ id: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })

    // 입력 시 에러 메시지 초기화
    if (error) setError("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // 입력 검증
    if (!formData.id.trim() || !formData.password.trim()) {
      setError("아이디와 비밀번호를 모두 입력해주세요.")
      return false
    }

    setLoading(true)
    setError("")

    try {
      await login(formData)

      // 폼 초기화
      setFormData({ id: "", password: "" })
      return true
    } catch (error) {
      console.error("로그인 오류:", error)

      // 서버 응답에 따른 에러 메시지 설정
      if (error.response) {
        if (error.response.status === 401) {
          setError("아이디 또는 비밀번호가 일치하지 않습니다.")
        } else if (error.response.status === 404) {
          setError("존재하지 않는 사용자입니다.")
        } else {
          setError("로그인 중 오류가 발생했습니다. 다시 시도해주세요.")
        }
      } else {
        setError("서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.")
      }
      return false
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ id: "", password: "" })
    setError("")
  }

  return {
    formData,
    error,
    loading,
    handleInputChange,
    handleSubmit,
    resetForm,
  }
}
