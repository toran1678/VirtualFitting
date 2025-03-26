import React, { useState } from 'react';

function App() {
  const [item, setItem] = useState({ name: '', description: '' });
  const [response, setResponse] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setItem({ ...item, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const response = await fetch('http://localhost:8000/create-item/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item),
    });
    const data = await response.json();
    setResponse(data);
  };

  return (
    <div>
      <h1>FastAPI와 React 연동</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Name:</label>
          <input
            type="text"
            name="name"
            value={item.name}
            onChange={handleInputChange}
          />
        </div>
        <div>
          <label>Description:</label>
          <input
            type="text"
            name="description"
            value={item.description}
            onChange={handleInputChange}
          />
        </div>
        <button type="submit">Submit</button>
      </form>

      {response && (
        <div>
          <h2>Response from FastAPI:</h2>
          <p>Name: {response.name}</p>
          <p>Description: {response.description}</p>
        </div>
      )}
    </div>
  );
}

export default App;
