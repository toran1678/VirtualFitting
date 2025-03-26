import React, { useState } from 'react';

function App() {
  return (
    <div>
      <nav>
        <NavLink to='/'>Start</NavLink>
        <Link to='/about'>About</Link>
        <Link to='/contact'>Contact</Link>
      </nav>
    </div>
  );
}

export default App;
