import React, { useState, useEffect } from 'react';
import api from './services/api';
import { 
  Server, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Layers, 
  ShieldCheck, 
  Clock, 
  Activity,
  Terminal,
  ExternalLink
} from 'lucide-react';

export default function App() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [latency, setLatency] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const fetchHealthStatus = async () => {
    setLoading(true);
    setError(null);
    const startTime = performance.now();

    try {
      // Calling GET /api/health via configured Axios client
      const response = await api.get('/health');
      const endTime = performance.now();
      setLatency(Math.round(endTime - startTime));
      setHealthData(response.data || response);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      const endTime = performance.now();
      setLatency(Math.round(endTime - startTime));
      setError(err.message || 'Failed to connect to Spring Boot backend');
      setHealthData(null);
      setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthStatus();
  }, []);

  const isConnected = !error && healthData?.status === 'UP';
  const isDbConnected = healthData?.database?.includes('CONNECTED');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
      </div>

      {/* Top Navigation */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="h-6 w-6 text-slate-950 font-bold" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                LabAttend
              </span>
              <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                Phase 1 Active
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-sm text-slate-400">
            <span className="hidden sm:inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Spring Boot + Supabase + React
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-12 flex flex-col justify-center">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 mb-4 shadow-inner">
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
            <span>Phase 1 Verification: End-to-End Connectivity Test</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            System Connectivity & Health Check
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
            This temporary interface verifies communication between the React frontend, the Spring Boot REST backend, and the Supabase PostgreSQL database.
          </p>
        </div>

        {/* Primary Health Card */}
        <div className="glass-panel rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
            <div className="flex items-center space-x-4">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                loading ? 'bg-slate-800 text-slate-400' :
                isConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}>
                {loading ? (
                  <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
                ) : isConnected ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-rose-400" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {loading ? 'Probing System Health...' : isConnected ? 'All Systems Operational' : 'Connectivity Issue Detected'}
                </h2>
                <p className="text-xs text-slate-400">
                  {lastChecked ? `Last probe at ${lastChecked}` : 'Initializing probe...'}
                  {latency !== null && ` • Latency: ${latency}ms`}
                </p>
              </div>
            </div>

            <button
              onClick={fetchHealthStatus}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 text-sm font-medium text-slate-200 transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Re-check Connectivity</span>
            </button>
          </div>

          {/* Grid of Key Subsystem Statuses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {/* Backend Service Card */}
            <div className="glass-card rounded-xl p-5 border border-slate-800/80">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2.5">
                  <Server className="h-5 w-5 text-indigo-400" />
                  <span className="font-medium text-slate-200 text-sm">Spring Boot Backend</span>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                  loading ? 'bg-slate-800 text-slate-400 border-slate-700' :
                  healthData?.status === 'UP' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  {loading ? 'CHECKING...' : healthData?.status || 'OFFLINE'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-2">
                Target: <code className="text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded">{import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}</code>
              </p>
              <div className="text-xs text-slate-500 flex items-center justify-between">
                <span>Version: {healthData?.version || '1.0.0'}</span>
                <span>Profile: {healthData?.environment || 'dev'}</span>
              </div>
            </div>

            {/* PostgreSQL / Supabase Card */}
            <div className="glass-card rounded-xl p-5 border border-slate-800/80">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2.5">
                  <Database className="h-5 w-5 text-teal-400" />
                  <span className="font-medium text-slate-200 text-sm">Supabase PostgreSQL</span>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                  loading ? 'bg-slate-800 text-slate-400 border-slate-700' :
                  isDbConnected 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {loading ? 'CHECKING...' : healthData?.database || 'PENDING DB CONFIG'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-2">
                Schema: <span className="text-slate-300 font-medium">Flyway V1 Migration Ready</span>
              </p>
              <div className="text-xs text-slate-500 flex items-center justify-between">
                <span>Driver: PostgreSQL JDBC</span>
                <span>DDL Mode: validate</span>
              </div>
            </div>
          </div>

          {/* Error Banner if connection failed */}
          {error && (
            <div className="mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-200">Unable to reach Spring Boot API</p>
                <p className="mt-1 text-slate-400">
                  Ensure the backend is running with <code className="bg-slate-900 px-1 py-0.5 rounded text-rose-300">mvn spring-boot:run</code> on port 8080 and that your CORS configuration allows <code className="text-slate-300">http://localhost:5173</code>.
                </p>
              </div>
            </div>
          )}

          {/* Toggle JSON Inspection */}
          <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between">
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>{showRawJson ? 'Hide Raw API Response' : 'Inspect Raw Health Payload'}</span>
            </button>
            <span className="text-xs text-slate-500">GET /api/health</span>
          </div>

          {showRawJson && (
            <div className="mt-3 p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-mono text-xs overflow-x-auto">
              <pre>{JSON.stringify(healthData || { error }, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* Phase 1 Verification Checklist */}
        <div className="glass-card rounded-xl p-6 border border-slate-800/80">
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-400" />
            <span>Phase 1 Architecture Deliverables</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              <span>12 Flyway V1 Tables with UUID PKs & Constraints</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              <span>JPA Entities & Spring Repositories Created</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              <span>Strict ddl-auto=validate Configured</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              <span>Vite + React + Tailwind + Axios Initialized</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              <span>Global Exception Handler & Response DTOs</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              <span>QR Token Assumption Documented in ASSUMPTIONS.md</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-900 py-4 px-6 text-center text-xs text-slate-500">
        LabAttend • Laboratory and Lecture Attendance Management • Phase 1
      </footer>
    </div>
  );
}
