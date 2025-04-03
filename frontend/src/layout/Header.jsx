import React, { useState } from 'react';
import Sidebar from "../components/Sidebar/Sidebar";
import './Header.css';

const Header = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);  // 사이드바 열림 상태 관리

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);  // 사이드바 열림/닫힘 상태 반전
    };

    return (
        <header className="header">
            <div className="header-left">
                <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} /> {/* 사이드바 컴포넌트에 상태 전달 */}
                <h1 className="logo">
                    My App{/*로고 부분*/}
                </h1>
            </div>
            <nav>
                <ul className="nav-links">
                    <li><a href='/'>Home</a></li>
                    <li><a href='/about'>About</a></li>
                    <li><a href='/test'>Test</a></li>
                </ul>
            </nav>
        </header>
    );
};

export default Header;