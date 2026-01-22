import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import axios from "axios"
import { API_BASE_URL } from "../util.js"

function StoryEditor() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [story, setStory] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [currentNodeId, setCurrentNodeId] = useState(null)
    const [currentNode, setCurrentNode] = useState(null)
    const [newContent, setNewContent] = useState("")
    const [newOptions, setNewOptions] = useState([{ text: "", node_id: "" }])

    useEffect(() => {
        loadStory(id)
    }, [id])

    useEffect(() => {
        if (story && story.all_nodes && currentNodeId) {
            const node = story.all_nodes[currentNodeId]
            if (node) {
                setCurrentNode(node)
                setNewContent(node.content)
                setNewOptions(node.options.map(option => ({ ...option })))
            }
        }
    }, [currentNodeId, story])

    const loadStory = async (storyId) => {
        setLoading(true)
        setError(null)
        try {
            const response = await axios.get(`${API_BASE_URL}/stories/${storyId}/complete`)
            setStory(response.data)
            setCurrentNodeId(response.data.root_node.id)
        } catch (err) {
            setError("Failed to load story")
        } finally {
            setLoading(false)
        }
    }

    const saveNode = async () => {
        try {
            await axios.put(`${API_BASE_URL}/stories/${story.id}/nodes/${currentNodeId}`, {
                content: newContent,
                options: newOptions
            })
            alert("Node saved successfully")
            loadStory(story.id)
        } catch (err) {
            setError("Failed to save node")
        }
    }

    const addOption = () => {
        setNewOptions([...newOptions, { text: "", node_id: "" }])
    }

    const removeOption = (index) => {
        setNewOptions(newOptions.filter((_, i) => i !== index))
    }

    const handleOptionChange = (index, field, value) => {
        const updatedOptions = [...newOptions]
        updatedOptions[index][field] = value
        setNewOptions(updatedOptions)
    }

    const createNewNode = async () => {
        try {
            const response = await axios.post(`${API_BASE_URL}/stories/${story.id}/nodes`, {
                content: "New story content",
                is_ending: false
            })
            alert("New node created successfully")
            loadStory(story.id)
        } catch (err) {
            setError("Failed to create new node")
        }
    }

    if (loading) {
        return <div className="story-editor">
            <h2>Loading story...</h2>
        </div>
    }

    if (error) {
        return <div className="story-editor">
            <div className="error-message">
                <p>{error}</p>
                <button onClick={() => loadStory(id)}>Try Again</button>
            </div>
        </div>
    }

    if (!story || !currentNode) {
        return <div className="story-editor">
            <p>Story not found</p>
        </div>
    }

    return <div className="story-editor">
        <div className="story-editor-header">
            <h2>Edit Story: {story.title}</h2>
            <button onClick={() => navigate(`/story/${story.id}`)} className="play-btn">
                Play Story
            </button>
            <button onClick={() => navigate("/stories")} className="back-btn">
                Back to Stories
            </button>
        </div>

        <div className="story-editor-content">
            <div className="node-selector">
                <h3>Select Node to Edit</h3>
                <select
                    value={currentNodeId}
                    onChange={(e) => setCurrentNodeId(e.target.value)}
                    className="node-select"
                >
                    {Object.values(story.all_nodes).map(node => (
                        <option key={node.id} value={node.id}>
                            {node.id} - {node.content.substring(0, 50)}{node.content.length > 50 ? "..." : ""}
                        </option>
                    ))}
                </select>
            </div>

            <div className="node-editor">
                <h3>Edit Node Content</h3>
                <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    rows={10}
                    className="content-textarea"
                    placeholder="Enter story content here..."
                />

                <div className="options-editor">
                    <h4>Options</h4>
                    {newOptions.map((option, index) => (
                        <div key={index} className="option-row">
                            <input
                                type="text"
                                value={option.text}
                                onChange={(e) => handleOptionChange(index, "text", e.target.value)}
                                placeholder="Option text"
                                className="option-text"
                            />
                            <input
                                type="text"
                                value={option.node_id}
                                onChange={(e) => handleOptionChange(index, "node_id", e.target.value)}
                                placeholder="Target node ID"
                                className="option-node-id"
                            />
                            {newOptions.length > 1 && (
                                <button
                                    onClick={() => removeOption(index)}
                                    className="remove-option-btn"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    ))}
                    <button onClick={addOption} className="add-option-btn">
                        Add Option
                    </button>
                </div>

                <div className="node-controls">
                    <button onClick={saveNode} className="save-btn">
                        Save Node
                    </button>
                    <button onClick={createNewNode} className="new-node-btn">
                        Create New Node
                    </button>
                </div>
            </div>
        </div>
    </div>
}

export default StoryEditor