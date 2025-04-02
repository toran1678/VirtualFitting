import React, { useState } from 'react';
import './Sidebar.css';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);  // 사이드바의 열린/닫힌 상태 관리

  const toggleSidebar = () => {
    setIsOpen(!isOpen);  // 버튼 클릭 시 상태 반전
  };

  return (
    <div>
      <button onClick={toggleSidebar} className="sidebar-toggle-btn">
        <div className={`bar ${isOpen ? 'open' : ''}`}></div>
        <div className={`bar ${isOpen ? 'open' : ''}`}></div>
        <div className={`bar ${isOpen ? 'open' : ''}`}></div>
        {/* {isOpen ? 'Close Sidebar' : 'Open Sidebar'} */}
      </button>
      
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <button onClick={toggleSidebar} className="sidebar-close-btn">X</button> {/* X 버튼 추가 */}
        <ul className="sidebar-links">
          <li><a href="/about">About</a></li>
          <li><a href="/start">Start</a></li>
          <li><a href="/test">Test</a></li>
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
