import React, { useState } from 'react';
import Header from "./layout/Header";
import Router from "./components/Router";

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);  // 사이드바 열림 상태 관리

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);  // 사이드바 열림/닫힘 상태 반전
  };

  return (
    <div className={`app-container ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      <Header toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
      <div className="content">
        <h1>Main Content Area</h1>
        <p>Here goes the content of your app.</p>
      </div>
      <Router />
    </div>
  );
}

export default App;
