"use client"

import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "./context/ThemeContext"
import { AuthProvider} from "./context/AuthContext"

import ScrollToTop from "./components/ScrollToTop"

// Importing pages
import MainPage from "./pages/MainPage/MainPage"
import RegisterPage from "./pages/RegisterPage/RegisterPage"
import KakaoCallback from "./components/KakaoCallback/KakaoCallback"
import LoginPage from "./pages/LoginPage/LoginPage"
import VirtualFittingPage from "./pages/VirtualFittingPage/VirtualFittingPage"
import VirtualFittingMainPage from "./pages/VirtualFittingMainPage/VirtualFittingMainPage"
import ClothingBrowsePage from "./pages/ClothingBrowsePage/ClothingBrowsePage"
import MyPage from "./pages/MyPage/MyPage"
import UserProfilePage from "./pages/UserProfilePage/UserProfilePage"
import FollowPage from "./pages/FollowPage/FollowPage"
import FeedPage from "./pages/FeedPage/FeedPage"
import CreateFeedPage from "./pages/CreateFeedPage/CreateFeedPage"
import FeedDetailPage from "./pages/FeedDetailPage/FeedDetailPage"
import EditFeedPage from "./pages/EditFeedPage/EditFeedPage"
import ProfileEditPage from "./pages/ProfileEditPage/ProfileEditPage"
import PersonImageManagePage from "./pages/PersonImageManagePage/PersonImageManagePage"
import MyCloset from "./pages/MyCloset/MyCloset"
import ClothingCustomizer from "./pages/ClothingCustomizer/ClothingCustomizer"

import "./App.css"

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <ScrollToTop /> {/* 페이지 이동 시 스크롤 맨위로 */}
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/auth/kakao/callback" element={<KakaoCallback />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/clothing-browse" element={<ClothingBrowsePage />} />
            <Route path="/virtual-fitting" element={<VirtualFittingPage />} />
            <Route path="/virtual-fitting-main" element={<VirtualFittingMainPage />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/create-feed" element={<CreateFeedPage />} />
            <Route path="/feed/:feedId" element={<FeedDetailPage />} />
            <Route path="/feed/:feedId/edit" element={<EditFeedPage />} />
            <Route path="/mypage" element={<MyPage />} />
            <Route path="/my-avatar" element={<PersonImageManagePage />} />
            <Route path="/profile/edit" element={<ProfileEditPage />}/>
            <Route path="/my-closet" element={<MyCloset />} />
            <Route path="/profile/:email" element={<UserProfilePage />} />
            <Route path="/follow/:email" element={<FollowPage />} />
            <Route path="/clothing-customizer" element={<ClothingCustomizer />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
