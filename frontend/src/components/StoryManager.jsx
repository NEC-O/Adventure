import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './StoryManager.css';

const API_BASE_URL = 'http://localhost:8000/api';

const StoryManager = () => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching stories from:', `${API_BASE_URL}/stories/`);
      
      const response = await fetch(`${API_BASE_URL}/stories/`, {
        method: 'GET',
        credentials: 'include', // 包含cookies
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      console.log('Fetched stories data:', data);
      setStories(data.stories || []);
    } catch (err) {
      console.error('Error fetching stories:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteStory = async (storyId) => {
    if (!window.confirm('确定要删除这个故事吗？此操作无法撤销。')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/stories/${storyId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      // 从列表中删除
      setStories(stories.filter(story => story.id !== storyId));
    } catch (err) {
      console.error('Error deleting story:', err);
      alert('删除故事失败: ' + err.message);
    }
  };

  const editStory = (storyId) => {
    console.log('Navigating to edit story:', storyId);
    navigate(`/story/${storyId}/edit`);
  };

  const playStory = (storyId) => {
    console.log('Navigating to play story:', storyId);
    navigate(`/story/${storyId}`);
  };

  const createNewStory = () => {
    navigate('/');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusText = (status) => {
    const statusMap = {
      'draft': '草稿',
      'completed': '已完成',
      'failed': '生成失败'
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status) => {
    const classMap = {
      'draft': 'status-draft',
      'completed': 'status-completed',
      'failed': 'status-failed'
    };
    return classMap[status] || '';
  };

  if (loading) {
    return (
      <div className="story-manager">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>正在加载故事列表...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="story-manager">
        <div className="error-container">
          <h3>加载失败</h3>
          <p className="error-message">{error}</p>
          <button onClick={fetchStories} className="retry-button">
            重新加载
          </button>
          <div style={{ marginTop: '20px', padding: '10px', background: '#f8f9fa', borderRadius: '5px' }}>
            <h4>调试信息:</h4>
            <p>API地址: {API_BASE_URL}/stories/</p>
            <p>当前时间: {new Date().toLocaleString()}</p>
            <p>浏览器信息: {navigator.userAgent}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="story-manager">
      <div className="manager-header">
        <h2>故事管理</h2>
        <button onClick={createNewStory} className="create-button">
          创建新故事
        </button>
      </div>

      {stories.length === 0 ? (
        <div className="empty-state">
          <p>还没有创建任何故事</p>
          <button onClick={createNewStory} className="create-button">
            创建第一个故事
          </button>
        </div>
      ) : (
        <div className="stories-grid">
          {stories.map((story) => (
            <div key={story.id} className="story-card">
              <div className="story-header">
                <h3 className="story-title">{story.title}</h3>
                <span className={`status-badge ${getStatusClass(story.status)}`}>
                  {getStatusText(story.status)}
                </span>
              </div>
              
              <div className="story-info">
                <p className="info-item">
                  <span className="info-label">创建时间:</span>
                  <span className="info-value">{formatDate(story.created_at)}</span>
                </p>
                <p className="info-item">
                  <span className="info-label">更新时间:</span>
                  <span className="info-value">{formatDate(story.updated_at)}</span>
                </p>
                <p className="info-item">
                  <span className="info-label">节点数:</span>
                  <span className="info-value">{story.node_count}</span>
                </p>
              </div>

              <div className="story-actions">
                <button 
                  onClick={() => playStory(story.id)} 
                  className="action-button play-button"
                  title="体验故事"
                >
                  开始游戏
                </button>
                <button 
                  onClick={() => editStory(story.id)} 
                  className="action-button edit-button"
                  title="编辑故事"
                >
                  编辑
                </button>
                <button 
                  onClick={() => deleteStory(story.id)} 
                  className="action-button delete-button"
                  title="删除故事"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StoryManager;