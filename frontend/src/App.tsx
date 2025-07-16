import './App.css'
import ImageAnnotator from './components/ImageAnnotator'

function App() {
  return (
    <div className="app" style={{ minHeight: '100vh' }}>
      <header>
        <h1>UI Element Annotator</h1>
        <p>Upload an image and draw boxes around UI elements to label them</p>
      </header>
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <ImageAnnotator />
      </main>
    </div>
  )
}

export default App
