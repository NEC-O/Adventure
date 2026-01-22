import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:8000/api';

function ApiTest() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    testApi();
  }, []);

  const testApi = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Testing API connection...');
      
      // Test GET request
      const response = await fetch(`${API_BASE_URL}/stories/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API response data:', data);
      setStories(data.stories || []);
      
    } catch (err) {
      console.error('API Test Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>API测试页面</h2>
      
      {loading && <p>正在测试API...</p>}
      
      {error && (
        <div style={{ color: 'red', marginBottom: '20px' }}>
          <p>错误: {error}</p>
          <button onClick={testApi}>重试</button>
        </div>
      )}
      
      {stories.length > 0 && (
        <div>
          <h3>找到的故事:</h3>
          {stories.map(story => (
            <div key={story.id} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #ccc' }}>
              <strong>{story.title}</strong> (ID: {story.id})
              <br />状态: {story.status}
              <br />节点数: {story.node_count}
            </div>
          ))}
        </div>
      )}
      
      {!loading && !error && stories.length === 0 && (
        <p>没有找到故事</p>
      )}
      
      <div style={{ marginTop: '20px' }}>
        <h3>调试信息:</h3>
        <p>API Base URL: {API_BASE_URL}</p>
        <p>当前时间: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
}

export default ApiTest;