import { BrowserRouter as Router } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <h1 className="text-3xl font-bold text-center pt-20 text-indigo-600">
          Mastery
        </h1>
        <p className="text-center mt-4 text-slate-500">
          Daily practice for tech interviews
        </p>
      </div>
    </Router>
  );
}

export default App;
