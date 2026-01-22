import './App.css'
import {BrowserRouter as Router, Routes, Route, Link, useLocation} from 'react-router-dom'
import {useState, useEffect} from 'react'
import StoryLoader from './components/StoryLoader'
import StoryGenerator  from './components/StoryGenerator.jsx'
import StoryManager from './components/StoryManager.jsx'
import StoryEditor from './components/StoryEditor.jsx'
import ApiTest from './components/ApiTest.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

function Navigation() {
  const location = useLocation()
  const [currentPath, setCurrentPath] = useState(location.pathname)

  useEffect(() => {
    setCurrentPath(location.pathname)
  }, [location])

  return (
    <nav className="main-nav">
      <div className="nav-links">
        <Link to="/" className={currentPath === '/' ? 'active' : ''}>
          创建故事
        </Link>
        <Link to="/stories" className={currentPath.startsWith('/stories') ? 'active' : ''}>
          故事管理
        </Link>
        <Link to="/api-test" className={currentPath === '/api-test' ? 'active' : ''}>
          API测试
        </Link>
      </div>
    </nav>
  )
}

function App() {
  return (
    <Router>
      <div className='app-container'>
        <header>
          <h1>Interactive Story Generator</h1>
          <Navigation />
        </header>
        <main>
          <ErrorBoundary>
            <Routes>
              <Route path={'/api-test'} element={<ApiTest />} />
              <Route path={'/story/:id/edit'} element={<StoryEditor />} />
              <Route path={'/story/:id'} element={<StoryLoader />} />
              <Route path={'/stories'} element={<StoryManager />} />
              <Route path={'/'} element={<StoryGenerator />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </Router>
  )
}

export default App
