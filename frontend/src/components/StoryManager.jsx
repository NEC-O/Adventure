import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { API_BASE_URL } from "../util.js"

function StoryManager() {
    const navigate = useNavigate()
    const [stories, setStories] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        loadStories()
    }, [])

    const loadStories = async () => {
        setLoading(true)
        setError(null)
        try {
            const response = await axios.get(`${API_BASE_URL}/stories/list`)
            setStories(response.data)
        } catch (err) {
            setError("Failed to load stories")
        } finally {
            setLoading(false)
        }
    }

    const deleteStory = async (storyId) => {
        if (window.confirm("Are you sure you want to delete this story?")) {
            try {
                await axios.delete(`${API_BASE_URL}/stories/${storyId}`)
                loadStories()
            } catch (err) {
                setError("Failed to delete story")
            }
        }
    }

    const editStory = (storyId) => {
        navigate(`/story/${storyId}/edit`)
    }

    const playStory = (storyId) => {
        navigate(`/story/${storyId}`)
    }

    const createNewStory = () => {
        navigate("/")
    }

    if (loading) {
        return <div className="story-manager">
            <h2>Loading stories...</h2>
        </div>
    }

    if (error) {
        return <div className="story-manager">
            <div className="error-message">
                <p>{error}</p>
                <button onClick={loadStories}>Try Again</button>
            </div>
        </div>
    }

    return <div className="story-manager">
        <div className="story-manager-header">
            <h2>Your Stories</h2>
            <button onClick={createNewStory} className="new-story-btn">
                Create New Story
            </button>
        </div>

        {stories.length === 0 ? (
            <div className="no-stories">
                <p>You haven't created any stories yet.</p>
                <button onClick={createNewStory} className="new-story-btn">
                    Create Your First Story
                </button>
            </div>
        ) : (
            <div className="stories-list">
                {stories.map((story) => (
                    <div key={story.id} className="story-item">
                        <div className="story-info">
                            <h3>{story.title}</h3>
                            <p className="created-at">
                                Created on: {new Date(story.created_at).toLocaleString()}
                            </p>
                        </div>
                        <div className="story-actions">
                            <button
                                onClick={() => playStory(story.id)}
                                className="play-btn"
                            >
                                Play
                            </button>
                            <button
                                onClick={() => editStory(story.id)}
                                className="edit-btn"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => deleteStory(story.id)}
                                className="delete-btn"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
}

export default StoryManager