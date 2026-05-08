import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Workbench from "@/pages/Workbench";
import Prompts from "@/pages/Prompts";
import Report from "@/pages/Report";
import History from "@/pages/History";
import SettingsPage from "@/pages/Settings";

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-[#0f0f1a]">
        <Sidebar />
        <main className="flex-1 ml-60 overflow-auto">
          <Routes>
            <Route path="/" element={<Workbench />} />
            <Route path="/prompts" element={<Prompts />} />
            <Route path="/report/:id" element={<Report />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
