import {useState, useEffect} from 'react';

function StoryGame({story, onNewStory, onEditStory}) {
    const [currentNodeId, setCurrentNodeId] = useState(null);
    const [currentNode, setCurrentNode] = useState(null);
    const [options, setOptions] = useState([]);
    const [isEnding, setIsEnding] = useState(false);
    const [isWinningEnding, setIsWinningEnding] = useState(false);
    const [visitedNodes, setVisitedNodes] = useState(new Set());
    const [pathHistory, setPathHistory] = useState([]);

    useEffect(() => {
        if (story && story.root_node) {
            const rootNodeId = story.root_node.id
            setCurrentNodeId(rootNodeId)
            setVisitedNodes(new Set([rootNodeId]))
            setPathHistory([rootNodeId])
        }
    }, [story])

    useEffect(() => {
        if (currentNodeId && story && story.all_nodes) {
            const node = story.all_nodes[currentNodeId]

            setCurrentNode(node)
            setIsEnding(node.is_ending)
            setIsWinningEnding(node.is_winning_ending)

            if (!node.is_ending && node.options && node.options.length > 0) {
                setOptions(node.options)
            } else {
                setOptions([])
            }
        }
    }, [currentNodeId, story])

    const chooseOption = (optionnId) => {
        setCurrentNodeId(optionnId)
        setVisitedNodes(prev => new Set([...prev, optionnId]))
        setPathHistory(prev => [...prev, optionnId])
    }

    const restartStory = () => {
        if (story && story.root_node.id) {
            setCurrentNodeId(story.root_node.id)
            setVisitedNodes(new Set([story.root_node.id]))
            setPathHistory([story.root_node.id])
        }
    }

    const goBack = () => {
        if (pathHistory.length > 1) {
            const newPath = pathHistory.slice(0, -1)
            setPathHistory(newPath)
            setCurrentNodeId(newPath[newPath.length - 1])
        }
    }

    const jumpToNode = (nodeId) => {
        if (visitedNodes.has(nodeId)) {
            const nodeIndex = pathHistory.indexOf(nodeId)
            if (nodeIndex !== -1) {
                const newPath = pathHistory.slice(0, nodeIndex + 1)
                setPathHistory(newPath)
                setCurrentNodeId(nodeId)
            }
        }
    }

    return <div className='story-game'>
        <header className='story-header'>
            <h2>{story.title}</h2>
            <div className='story-controls-header'>
                {pathHistory.length > 1 && (
                    <button onClick={goBack} className='back-btn'>
                        ← 返回上一步
                    </button>
                )}
                {onEditStory && (
                    <button onClick={onEditStory} className='edit-btn'>
                        编辑故事
                    </button>
                )}
            </div>
        </header>
        
        <div className='story-content'>
            {currentNode && <div className='story-node'>
                <p>{currentNode.content}</p>

                {isEnding ? 
                    <div className='story-ending'>
                        <h3>{isWinningEnding ? 'Congratulations!': 'The End'}</h3>
                        {isWinningEnding ? 'You reached a winning ending': 'Your adventure has end.'}
                    </div>
                    :
                    <div className='story-options'>
                        <h3>What will you do?</h3>
                        <div className='options-list'>
                            {options.map((option, index) => {
                                return <button
                                    key={index}
                                    onClick={() => chooseOption(option.node_id)}
                                    className='option-btn'
                                    >
                                    {option.text}
                                    </button>
                            })}
                        </div>
                    </div>
                }
            </div>}

            <div className='story-controls'>
                <button onClick={restartStory} className='reset-btn'>
                    Restart Story
                </button>
                {onNewStory && <button onClick={onNewStory} className='new-story-btn'>
                    New Story
                </button>}
            </div>
        </div>

        {visitedNodes.size > 1 && (
            <div className='story-path'>
                <h4>已访问的节点（点击可跳转）:</h4>
                <div className='path-nodes'>
                    {Array.from(visitedNodes).map(nodeId => {
                        const node = story.all_nodes[nodeId];
                        return (
                            <button
                                key={nodeId}
                                onClick={() => jumpToNode(nodeId)}
                                className={`path-node ${currentNodeId === nodeId ? 'current' : ''}`}
                                title={node ? node.content : `Node ${nodeId}`}
                            >
                                #{nodeId}
                            </button>
                        );
                    })}
                </div>
            </div>
        )}
    </div>

}

export default StoryGame