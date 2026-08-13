import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Upload from './pages/Upload.jsx';
import Report from './pages/Report.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/analyze" element={<Upload />} />
      <Route path="/report/:id" element={<Report />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
