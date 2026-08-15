function App() {
  return (
    <div className="container py-5">
      <header className="pb-3 mb-4 border-bottom">
        <h1 className="display-5 fw-bold text-primary">TokTickIT</h1>
        <p className="lead text-muted">IT Request &amp; Service Portal</p>
      </header>

      <main>
        <div className="p-5 mb-4 bg-light rounded-3 shadow-sm border">
          <div className="container-fluid py-3">
            <h2 className="display-6 fw-bold">Project Foundation Initialized</h2>
            <p className="col-md-8 fs-5 text-secondary">
              TokTickIT frontend is running with React, TypeScript, Vite, and Bootstrap.
            </p>
            <button className="btn btn-primary btn-lg" type="button">
              Check System
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
