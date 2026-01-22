import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './StoryEditor.css';

const API_BASE_URL = 'http://localhost:8000/api';

const StoryEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [nodeContent, setNodeContent] = useState('');
  const [nodeOptions, setNodeOptions] = useState([]);
  const [newOptionText, setNewOptionText] = useState('');

  useEffect(() => {
    fetchStory();
  }, [id]);

  const fetchStory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching story from:', `${API_BASE_URL}/stories/${id}`);
      
      const response = await fetch(`${API_BASE_URL}/stories/${id}`, {
        method: 'GET',
        credentials: 'include',
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
      console.log('Fetched story data:', data);
      setStory(data);
      if (data.root_node) {
        setSelectedNode(data.root_node);
        setNodeContent(data.root_node.content);
        setNodeOptions(data.root_node.options || []);
      }
    } catch (err) {
      console.error('Error fetching story:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStoryTitle = async (newTitle) => {
    try {
      console.log('Updating story title to:', newTitle);
      
      const response = await fetch(`${API_BASE_URL}/stories/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newTitle }),
      });

      console.log('Update response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const updatedStory = await response.json();
      console.log('Updated story:', updatedStory);
      setStory(updatedStory);
    } catch (err) {
      console.error('Error updating story title:', err);
      alert('更新故事标题失败: ' + err.message);
    }
  };

  const updateNode = async () => {
    if (!selectedNode) return;

    try {
      console.log('Updating node:', selectedNode.id);
      console.log('New content:', nodeContent);
      console.log('New options:', nodeOptions);
      
      const response = await fetch(`${API_BASE_URL}/stories/${id}/nodes/${selectedNode.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: nodeContent,
          options: nodeOptions,
        }),
      });

      console.log('Update node response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const updatedNode = await response.json();
      console.log('Updated node:', updatedNode);
      
      // 更新本地状态
      setSelectedNode(updatedNode);
      setStory(prev => ({
        ...prev,
        all_nodes: {
          ...prev.all_nodes,
          [updatedNode.id]: updatedNode
        }
      }));
      
      setEditMode(false);
      alert('节点更新成功！');
    } catch (err) {
      console.error('Error updating node:', err);
      alert('更新节点失败: ' + err.message);
    }
  };

  const createNewNode = async (parentNodeId) => {
    const content = prompt('请输入新节点的内容:');
    if (!content) return;

    try {
      console.log('Creating new node with content:', content);
      console.log('Parent node ID:', parentNodeId);
      
      const response = await fetch(`${API_BASE_URL}/stories/${id}/nodes`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content,
          parent_node_id: parentNodeId,
          is_ending: false,
          is_winning_ending: false,
          options: [],
        }),
      });

      console.log('Create node response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const newNode = await response.json();
      console.log('Created new node:', newNode);
      
      // 重新获取故事数据以更新节点结构
      await fetchStory();
      alert('新节点创建成功！');
    } catch (err) {
      console.error('Error creating new node:', err);
      alert('创建新节点失败: ' + err.message);
    }
  };

  const deleteNode = async (nodeId) => {
    if (!window.confirm('确定要删除这个节点吗？此操作无法撤销。')) {
      return;
    }

    try {
      console.log('Deleting node:', nodeId);
      
      const response = await fetch(`${API_BASE_URL}/stories/${id}/nodes/${nodeId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Delete node response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      // 重新获取故事数据
      await fetchStory();
      setSelectedNode(null);
      alert('节点删除成功！');
    } catch (err) {
      console.error('Error deleting node:', err);
      alert('删除节点失败: ' + err.message);
    }
  };

  const addOption = () => {
    if (!newOptionText.trim()) return;
    
    setNodeOptions([...nodeOptions, {
      text: newOptionText.trim(),
      node_id: null
    }]);
    setNewOptionText('');
  };

  const removeOption = (index) => {
    setNodeOptions(nodeOptions.filter((_, i) => i !== index));
  };

  const renderNodeTree = (node, level = 0) => {
    if (!node) return null;
    
    const isSelected = selectedNode && selectedNode.id === node.id;
    
    return (
      <div key={node.id} className={`node-tree-item level-${level}`}>
        <div 
          className={`node-item ${isSelected ? 'selected' : ''}`}
          onClick={() => {
            setSelectedNode(node);
            setNodeContent(node.content);
            setNodeOptions(node.options || []);
            setEditMode(false);
          }}
        >
          <div className="node-content">
            <span className="node-id">#{node.id}</span>
            <span className="node-text">{node.content}</span>
            {node.is_ending && <span className="ending-badge">结局</span>}
            {node.is_winning_ending && <span className="winning-badge">胜利</span>}
          </div>
          <div className="node-actions">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                createNewNode(node.id);
              }}
              className="small-button add-button"
              title="添加子节点"
            >
              +
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                deleteNode(node.id);
              }}
              className="small-button delete-button"
              title="删除节点"
            >
              ×
            </button>
          </div>
        </div>
        
        {node.options && node.options.map((option, index) => {
          const childNode = story.all_nodes[option.node_id];
          return childNode ? renderNodeTree(childNode, level + 1) : null;
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="story-editor">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>正在加载故事...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="story-editor">
        <div className="error-container">
          <h3>加载失败</h3>
          <p className="error-message">{error}</p>
          <button onClick={fetchStory} className="retry-button">
            重新加载
          </button>
          <div style={{ marginTop: '20px', padding: '10px', background: '#f8f9fa', borderRadius: '5px' }}>
            <h4>调试信息:</h4>
            <p>故事ID: {id}</p>
            <p>API地址: {API_BASE_URL}/stories/{id}</p>
            <p>当前时间: {new Date().toLocaleString()}</p>
            <p>浏览器信息: {navigator.userAgent}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="story-editor">
      <div className="editor-header">
        <button onClick={() => navigate('/stories')} className="back-button">
          ← 返回故事列表
        </button>
        <h2>故事编辑器</h2>
        <div className="header-actions">
          <button 
            onClick={() => navigate(`/story/${id}`)} 
            className="play-button"
          >
            开始游戏
          </button>
        </div>
      </div>

      <div className="editor-content">
        <div className="story-info">
          <h3>故事信息</h3>
          <div className="info-item">
            <label>标题:</label>
            <input
              type="text"
              value={story.title}
              onChange={(e) => {
                const newTitle = e.target.value;
                setStory({ ...story, title: newTitle });
                updateStoryTitle(newTitle);
              }}
              className="title-input"
            />
          </div>
          <div className="info-item">
            <label>状态:</label>
            <span className={`status-badge status-${story.status}`}>
              {story.status === 'draft' ? '草稿' : 
               story.status === 'completed' ? '已完成' : '失败'}
            </span>
          </div>
          <div className="info-item">
            <label>创建时间:</label>
            <span>{new Date(story.created_at).toLocaleString('zh-CN')}</span>
          </div>
        </div>

        <div className="editor-main">
          <div className="node-tree">
            <h3>故事结构</h3>
            {story.root_node && renderNodeTree(story.root_node)}
          </div>

          {selectedNode && (
            <div className="node-editor">
              <h3>节点编辑 (ID: {selectedNode.id})</h3>
              
              <div className="editor-section">
                <label>节点内容:</label>
                {editMode ? (
                  <textarea
                    value={nodeContent}
                    onChange={(e) => setNodeContent(e.target.value)}
                    className="content-textarea"
                    rows="6"
                  />
                ) : (
                  <div className="content-display">{selectedNode.content}</div>
                )}
              </div>

              <div className="editor-section">
                <label>选项:</label>
                {editMode ? (
                  <div className="options-editor">
                    {nodeOptions.map((option, index) => (
                      <div key={index} className="option-item">
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => {
                            const newOptions = [...nodeOptions];
                            newOptions[index].text = e.target.value;
                            setNodeOptions(newOptions);
                          }}
                          className="option-input"
                        />
                        <button
                          onClick={() => removeOption(index)}
                          className="remove-option"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <div className="add-option">
                      <input
                        type="text"
                        value={newOptionText}
                        onChange={(e) => setNewOptionText(e.target.value)}
                        placeholder="添加新选项"
                        className="option-input"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addOption();
                          }
                        }}
                      />
                      <button onClick={addOption} className="add-option-btn">
                        添加
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="options-display">
                    {nodeOptions.length > 0 ? (
                      nodeOptions.map((option, index) => (
                        <div key={index} className="option-item">
                          {option.text}
                          {option.node_id && (
                            <span className="node-reference">
                              → 节点 #{option.node_id}
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="no-options">无选项</div>
                    )}
                  </div>
                )}
              </div>

              <div className="editor-actions">
                {editMode ? (
                  <>
                    <button onClick={updateNode} className="save-button">
                      保存
                    </button>
                    <button onClick={() => setEditMode(false)} className="cancel-button">
                      取消
                    </button>
                  </>
                ) : (
                  <button onClick={() => setEditMode(true)} className="edit-button">
                    编辑节点
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryEditor;