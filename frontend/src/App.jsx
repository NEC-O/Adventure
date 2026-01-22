import './App.css'
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import StoryLoader from './components/StoryLoader'
import StoryGenerator  from './components/StoryGenerator.jsx'
import StoryManager from './components/StoryManager.jsx'
import StoryEditor from './components/StoryEditor.jsx'

function App() {
  return (
    <Router>
      <div className='app-container'>
        <header>
          <h1>Iteractive Story Generator</h1>
          <nav>
            <ul>
              <li><a href="/">Create Story</a></li>
              <li><a href="/stories">Manage Stories</a></li>
            </ul>
          </nav>
        </header>
        <main>
          <Routes>
            <Route path={'/story/:id'} element={<StoryLoader />} />
            <Route path={'/story/:id/edit'} element={<StoryEditor />} />
            <Route path={'/stories'} element={<StoryManager />} />
            <Route path={'/'} element={<StoryGenerator />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
