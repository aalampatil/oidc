import './App.css'
import Header from './components/custom/Header/Header'
import Footer from './components/custom/Footer/Footer'
import { Outlet } from 'react-router-dom'

function App() {


  return (
    <>
      <div
        className="bg-background min-h-screen box-border"
        style={{
          backgroundImage: `
      linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px),
      linear-gradient(#e7f7cf)
    `,
          backgroundSize: "75px 75px, 75px 75px, 100% 100%",
        }}
      >
        <Header />

        <div className="min-h-screen">
          <Outlet />
        </div>

        <Footer />
      </div>
    </>
  )
}

export default App
