import './App.css'
import ChatPage from './components/ChatPage'
import JoinPage from './components/JoinPage'

import {BrowserRouter as Router,Routes,Route} from 'react-router-dom'

function App() {

  return (
    <div>
      <Router>
        <Routes>
          <Route path='/' element={<JoinPage />} />
          <Route path='/chat' element={<ChatPage />} />
        </Routes>
      </Router>
    </div>
  )
}

export default App
