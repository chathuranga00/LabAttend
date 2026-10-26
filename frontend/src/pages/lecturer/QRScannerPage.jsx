import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Camera, 
  CameraOff, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Users, 
  UserCheck, 
  UserX, 
  Search, 
  RefreshCw, 
  ArrowLeft, 
  Clock, 
  Building, 
  AlertCircle,
  FileEdit,
  ShieldAlert,
  WifiOff
} from 'lucide-react';
import { attendanceService } from '../../services/attendanceService';
import { sessionService } from '../../services/sessionService';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/common';
import EndSessionModal from '../../components/session/EndSessionModal';

export default function QRScannerPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const querySessionId = searchParams.get('sessionId');

  // Session state
  const [activeSessions, setActiveSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(querySessionId || '');
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(false);

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const html5QrCodeRef = useRef(null);
  const scanLockRef = useRef(false);
  const lastScannedPayloadRef = useRef(null);
  const lastScannedTimeRef = useRef(0);

  // Counters state (from backend)
  const [counters, setCounters] = useState({
    expected: 0,
    present: 0,
    remaining: 0,
  });

  // Last scan feedback state
  // type: 'SUCCESS' | 'ALREADY_MARKED' | 'ERROR' | null
  const [lastScanResult, setLastScanResult] = useState(null);

  // Attendance live list state
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [tableSearch, setTableSearch] = useState('');

  // Manual Attendance modal state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [expectedStudents, setExpectedStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudentForManual, setSelectedStudentForManual] = useState(null);
  const [manualReason, setManualReason] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);

  // End Session modal state
  const [isEndSessionModalOpen, setIsEndSessionModalOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // 1. Fetch lecturer's active sessions if no session or to populate selector
  const fetchActiveSessions = useCallback(async () => {
    try {
      const res = await sessionService.getLecturerSessions({ status: 'ACTIVE' });
      if (res.success && res.data) {
        const list = res.data.content || [];
        setActiveSessions(list);
        if (!selectedSessionId && list.length > 0) {
          setSelectedSessionId(list[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load active sessions:', err);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    fetchActiveSessions();
  }, [fetchActiveSessions]);

  // 2. Fetch selected session details
  const fetchSessionDetails = useCallback(async (id) => {
    if (!id) return;
    try {
      setLoadingSession(true);
      const res = await sessionService.getLecturerSessionById(id);
      if (res.success && res.data) {
        const s = res.data;
        setSession(s);
        setCounters({
          expected: s.expectedStudentCount || 0,
          present: s.attendedCount || 0,
          remaining: Math.max(0, (s.expectedStudentCount || 0) - (s.attendedCount || 0)),
        });
      }
    } catch (err) {
      showToast(err.message || 'Failed to load session info', 'error');
    } finally {
      setLoadingSession(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (selectedSessionId) {
      fetchSessionDetails(selectedSessionId);
    }
  }, [selectedSessionId, fetchSessionDetails]);

  // 3. Fetch live attendance list for this session
  const fetchAttendanceRecords = useCallback(async (id, search = '') => {
    if (!id) return;
    try {
      setLoadingRecords(true);
      const res = await attendanceService.getSessionAttendance(id, {
        search: search.trim() || undefined,
        page: 0,
        size: 50,
      });
      if (res.success && res.data) {
        setAttendanceRecords(res.data.content || []);
      }
    } catch (err) {
      console.error('Failed to load attendance list:', err);
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      fetchAttendanceRecords(selectedSessionId, tableSearch);
    }
  }, [selectedSessionId, tableSearch, fetchAttendanceRecords]);

  // 4. Process QR Code Scan Payload
  const handleScanPayload = useCallback(async (identifier) => {
    if (!identifier || !selectedSessionId) return;

    const trimmed = identifier.trim();
    const now = Date.now();

    // Debounce: prevent sending the identical code within 2 seconds
    if (
      lastScannedPayloadRef.current === trimmed &&
      now - lastScannedTimeRef.current < 2000
    ) {
      return;
    }

    if (scanLockRef.current) {
      return;
    }

    scanLockRef.current = true;
    lastScannedPayloadRef.current = trimmed;
    lastScannedTimeRef.current = now;

    try {
      const res = await attendanceService.scanQr(selectedSessionId, trimmed);

      if (res && res.success && res.data) {
        const data = res.data;

        // Update counters directly from backend
        setCounters({
          expected: data.totalExpected,
          present: data.attendedCount,
          remaining: data.remainingCount,
        });

        if (data.result === 'SUCCESS') {
          setLastScanResult({
            type: 'SUCCESS',
            title: 'Attendance Recorded',
            message: data.message || 'Marked Present',
            studentId: data.studentId,
            studentName: data.studentName,
            time: data.scannedAt,
            method: data.method || 'QR_SCAN',
          });
          showToast(`Present: ${data.studentName} (${data.studentId})`, 'success');
        } else if (data.result === 'ALREADY_MARKED') {
          setLastScanResult({
            type: 'ALREADY_MARKED',
            title: 'Already Marked Present',
            message: `Previously verified at ${new Date(data.scannedAt).toLocaleTimeString()}`,
            studentId: data.studentId,
            studentName: data.studentName,
            time: data.scannedAt,
            method: data.method || 'QR_SCAN',
          });
          showToast(`Already Marked: ${data.studentName} (${data.studentId})`, 'info');
        }

        // Refresh attendance table
        fetchAttendanceRecords(selectedSessionId, tableSearch);
      } else {
        // Fallback if success flag not explicitly true
        setLastScanResult({
          type: 'ERROR',
          title: 'Scan Rejected',
          message: res?.message || 'Server did not verify this scan.',
          rawIdentifier: trimmed,
          time: new Date().toISOString(),
        });
      }
    } catch (err) {
      const isNetwork = err.isNetworkError || err.status === 0;
      const errorMsg = err.message || (isNetwork ? 'Unable to connect to the server. Check your connection and try again.' : 'Verification failed');

      setLastScanResult({
        type: 'ERROR',
        title: isNetwork ? 'Network Error' : (err.status === 400 || err.status === 404 ? 'Verification Denied' : 'Scan Rejected'),
        message: errorMsg,
        rawIdentifier: trimmed,
        time: new Date().toISOString(),
      });

      showToast(errorMsg, 'error');
    } finally {
      // Release lock after brief delay
      setTimeout(() => {
        scanLockRef.current = false;
      }, 1000);
    }
  }, [selectedSessionId, tableSearch, fetchAttendanceRecords, showToast]);

  // 5. Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-scanner-viewport');
      }

      // Check if already running
      if (html5QrCodeRef.current.isScanning) {
        return;
      }

      const qrCodeSuccessCallback = (decodedText) => {
        handleScanPayload(decodedText);
      };

      const qrCodeErrorCallback = () => {
        // Ignore continuous frame parse misses
      };

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      // Prefer rear camera on mobile devices
      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        config,
        qrCodeSuccessCallback,
        qrCodeErrorCallback
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Camera initialization error:', err);
      let userMsg = 'Unable to access camera. Please check your browser settings and try again.';

      const name = err.name || '';
      const msg = err.message || '';

      if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || msg.includes('Permission denied')) {
        userMsg = 'Camera Access Denied — Please grant camera permissions in your browser to scan badges.';
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || msg.includes('No device')) {
        userMsg = 'Camera Not Found — No compatible camera detected on this device. Use manual check-in instead.';
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        userMsg = 'Camera In Use — The camera is currently being used by another application or tab.';
      }

      setCameraError(userMsg);
      setIsScanning(false);
    }
  };

  // 6. Stop Camera
  const stopCamera = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }
    } catch (err) {
      console.error('Error stopping camera:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // Lifecycle: cleanup camera on component unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // 7. Manual Attendance Handler
  const handleOpenManualModal = async () => {
    if (!selectedSessionId) return;
    setIsManualModalOpen(true);
    setSelectedStudentForManual(null);
    setManualReason('');
    setManualSearchQuery('');
    fetchExpectedStudents('');
  };

  const fetchExpectedStudents = async (query) => {
    if (!selectedSessionId) return;
    try {
      setLoadingStudents(true);
      const res = await attendanceService.getExpectedStudents(selectedSessionId, query);
      if (res.success && res.data) {
        setExpectedStudents(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to search student roster', 'error');
    } finally {
      setLoadingStudents(false);
    }
  };

  const submitManualAttendance = async () => {
    if (!selectedStudentForManual) {
      showToast('Please select a student from the expected roster', 'error');
      return;
    }
    if (!manualReason.trim()) {
      showToast('A justification reason is required for manual attendance recording', 'error');
      return;
    }

    try {
      setSubmittingManual(true);
      const res = await attendanceService.recordManualAttendance(selectedSessionId, {
        studentId: selectedStudentForManual.studentUuid,
        reason: manualReason.trim(),
      });

      if (res && res.success && res.data) {
        const data = res.data;
        setCounters({
          expected: data.totalExpected,
          present: data.attendedCount,
          remaining: data.remainingCount,
        });

        if (data.result === 'SUCCESS') {
          setLastScanResult({
            type: 'SUCCESS',
            title: 'Manual Attendance Recorded',
            message: `Recorded manually: ${manualReason.trim()}`,
            studentId: data.studentId,
            studentName: data.studentName,
            time: data.scannedAt,
            method: 'MANUAL',
          });
          showToast(`Recorded: ${data.studentName}`, 'success');
        } else {
          setLastScanResult({
            type: 'ALREADY_MARKED',
            title: 'Already Marked Present',
            message: `Previously verified at ${new Date(data.scannedAt).toLocaleTimeString()}`,
            studentId: data.studentId,
            studentName: data.studentName,
            time: data.scannedAt,
            method: data.method,
          });
          showToast(`Student already present`, 'info');
        }

        setIsManualModalOpen(false);
        fetchAttendanceRecords(selectedSessionId, tableSearch);
      }
    } catch (err) {
      showToast(err.message || 'Failed to record manual attendance', 'error');
    } finally {
      setSubmittingManual(false);
    }
  };

  const handleFinalizeSession = async (notes) => {
    if (!selectedSessionId) return;
    try {
      setFinalizing(true);
      if (isScanning) {
        await stopCamera();
      }
      const res = await sessionService.finalizeSession(selectedSessionId, { notes });
      if (res.success) {
        showToast('Session finalized successfully! Absentee records generated.', 'success');
        setIsEndSessionModalOpen(false);
        navigate(`/lecturer/sessions/${selectedSessionId}/summary`);
      }
    } catch (err) {
      showToast(err.message || 'Failed to finalize session', 'error');
    } finally {
      setFinalizing(false);
    }
  };

  const attendancePercent = counters.expected > 0
    ? ((counters.present / counters.expected) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/lecturer/sessions"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>My Lab Sessions</span>
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-sm font-semibold text-teal-400">Badge Scanner Terminal</span>
        </div>

        {/* End Session Button */}
        {session && session.status === 'ACTIVE' && (
          <button
            onClick={() => setIsEndSessionModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold shadow-sm transition"
          >
            <Clock className="h-4 w-4 text-amber-400" />
            <span>End Attendance Session</span>
          </button>
        )}
      </div>

      {/* Active Session Picker Bar (if multiple active or changing) */}
      {activeSessions.length > 1 && (
        <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Switch Active Lab Session:</span>
          <select
            value={selectedSessionId}
            onChange={(e) => {
              setSelectedSessionId(e.target.value);
              setLastScanResult(null);
            }}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 font-semibold focus:outline-none focus:border-teal-500"
          >
            {activeSessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.sessionCode} — {s.moduleCode} ({s.batchName})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* No Active Session Warning */}
      {!loadingSession && (!session || session.status !== 'ACTIVE') && (
        <div className="p-6 bg-amber-950/30 border border-amber-800/60 rounded-2xl text-center space-y-3">
          <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">No Active Attendance Session Selected</h2>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            {session && session.status !== 'ACTIVE'
              ? `Session ${session.sessionCode} is currently ${session.status}. Attendance scanning is only permitted on ACTIVE sessions.`
              : 'You do not currently have an active laboratory session open for attendance.'}
          </p>
          <div className="pt-2">
            <Link
              to="/lecturer/sessions"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs transition"
            >
              <span>View Sessions & Start Lab</span>
            </Link>
          </div>
        </div>
      )}

      {/* Session Info Header */}
      {session && (
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono font-bold text-teal-400 bg-teal-950/60 border border-teal-800/60 px-3 py-1 rounded text-xs">
                  {session.sessionCode}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  {session.status}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight mt-2.5">
                {session.moduleCode} — {session.moduleName}
              </h1>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-300">
                <span className="flex items-center gap-1.5 bg-slate-800/70 px-2.5 py-1 rounded-lg">
                  <Users className="h-3.5 w-3.5 text-teal-400" />
                  <span>Batch: <strong>{session.batchName}</strong></span>
                </span>
                <span className="flex items-center gap-1.5 bg-slate-800/70 px-2.5 py-1 rounded-lg">
                  <Building className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Hall: <strong>{session.hallName} ({session.hallCode})</strong></span>
                </span>
                <span className="flex items-center gap-1.5 bg-slate-800/70 px-2.5 py-1 rounded-lg">
                  <Clock className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Time: <strong>{session.startTime?.substring(0, 5)} - {session.endTime?.substring(0, 5)}</strong></span>
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleOpenManualModal}
                disabled={session.status !== 'ACTIVE'}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition disabled:opacity-50"
              >
                <FileEdit className="h-4 w-4 text-cyan-400" />
                <span>Manual Student Entry</span>
              </button>

              {session.status === 'ACTIVE' && (
                <button
                  onClick={() => setIsEndSessionModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950/40 transition"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>End Attendance Session</span>
                </button>
              )}

              {session.status === 'FINALIZED' && (
                <Link
                  to={`/lecturer/sessions/${session.id}/summary`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-950/40 transition"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>View Session Summary</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Counters Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Expected */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Expected Roster</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {counters.expected}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Snapshot cohort assigned to lab</p>
        </div>

        {/* Present */}
        <div className="bg-slate-900/60 border border-emerald-900/40 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Marked Present</span>
            <UserCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">
            {counters.present}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Attendance Rate</span>
            <span className="font-semibold text-emerald-400">{attendancePercent}%</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, parseFloat(attendancePercent))}%` }}
            />
          </div>
        </div>

        {/* Remaining Unmarked */}
        <div className="bg-slate-900/60 border border-amber-900/30 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-amber-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Remaining Unchecked</span>
            <UserX className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400">
            {counters.remaining}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Pending scan (not yet finalized)</p>
        </div>
      </div>

      {/* Main Scanner Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Camera Viewport & Last Scanned Student Card */}
        <div className="lg:col-span-5 space-y-6">
          {/* Camera Card */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
                  <Camera className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Camera Badge Scanner</h3>
                  <p className="text-[11px] text-slate-400">Point device camera at student badge</p>
                </div>
              </div>

              {/* Start/Stop Camera Button */}
              {isScanning ? (
                <button
                  onClick={stopCamera}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-400 border border-rose-800/60 text-xs font-semibold transition"
                >
                  <CameraOff className="h-3.5 w-3.5" />
                  <span>Stop Camera</span>
                </button>
              ) : (
                <button
                  onClick={startCamera}
                  disabled={!session || session.status !== 'ACTIVE'}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 text-xs font-bold shadow-lg shadow-teal-500/20 transition disabled:opacity-50"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Start Camera</span>
                </button>
              )}
            </div>

            {/* Camera Viewport Container */}
            <div className="relative w-full aspect-square bg-slate-950 rounded-xl border-2 border-dashed border-slate-800 overflow-hidden flex flex-col items-center justify-center">
              {/* html5-qrcode video viewport mounting point */}
              <div id="qr-scanner-viewport" className="w-full h-full" />

              {!isScanning && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 pointer-events-none">
                  <div className="h-16 w-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3 text-teal-400">
                    <QrCode className="h-8 w-8" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">Camera Feed Inactive</h4>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Click "Start Camera" above to activate device badge scanning.
                  </p>
                </div>
              )}

              {/* Camera Error Message */}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/95 space-y-3">
                  <AlertCircle className="h-10 w-10 text-rose-400" />
                  <p className="text-xs text-rose-300 font-medium px-4">
                    {cameraError}
                  </p>
                  <button
                    onClick={startCamera}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {/* Scanning Active Overlay Crosshairs */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-4">
                  <div className="w-full flex justify-between items-center text-[10px] text-teal-400 bg-slate-900/80 px-2.5 py-1 rounded-md backdrop-blur border border-teal-500/20">
                    <span className="flex items-center gap-1.5 font-bold">
                      <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
                      LIVE SCANNER
                    </span>
                    <span>Align QR Code in target box</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Last Scanned Student Feedback Card */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Last Scanned Badge Status
            </h3>

            {!lastScanResult && (
              <div className="p-5 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
                Ready to scan. Student check-in details will appear here instantly.
              </div>
            )}

            {lastScanResult && lastScanResult.type === 'SUCCESS' && (
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/50 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <span>{lastScanResult.title}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    {lastScanResult.method}
                  </span>
                </div>
                <div className="text-lg font-bold text-white">
                  {lastScanResult.studentName}
                </div>
                <div className="flex items-center justify-between text-xs text-emerald-200">
                  <span className="font-mono bg-emerald-900/50 px-2 py-0.5 rounded border border-emerald-800/50">
                    {lastScanResult.studentId}
                  </span>
                  <span>{new Date(lastScanResult.time).toLocaleTimeString()}</span>
                </div>
              </div>
            )}

            {lastScanResult && lastScanResult.type === 'ALREADY_MARKED' && (
              <div className="p-4 bg-amber-950/40 border border-amber-500/50 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <span>{lastScanResult.title}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    DUPLICATE
                  </span>
                </div>
                <div className="text-lg font-bold text-white">
                  {lastScanResult.studentName}
                </div>
                <div className="flex items-center justify-between text-xs text-amber-200">
                  <span className="font-mono bg-amber-900/50 px-2 py-0.5 rounded border border-amber-800/50">
                    {lastScanResult.studentId}
                  </span>
                  <span>{lastScanResult.message}</span>
                </div>
              </div>
            )}

            {lastScanResult && lastScanResult.type === 'ERROR' && (
              <div className="p-4 bg-rose-950/40 border border-rose-500/50 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <XCircle className="h-5 w-5 shrink-0" />
                  <span>{lastScanResult.title}</span>
                </div>
                <p className="text-xs text-rose-200 font-medium">
                  {lastScanResult.message}
                </p>
                {lastScanResult.rawIdentifier && (
                  <div className="text-[11px] font-mono text-rose-400 bg-rose-900/30 px-2 py-1 rounded">
                    Scanned: {lastScanResult.rawIdentifier}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Attendance Record Table */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Live Attendance Stream</h3>
                <p className="text-xs text-slate-400">Real-time check-in records for this laboratory session</p>
              </div>

              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Search attendee..."
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 w-44"
                  />
                </div>

                {/* Refresh */}
                <button
                  onClick={() => fetchAttendanceRecords(selectedSessionId, tableSearch)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  title="Refresh attendance records"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingRecords ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Student ID</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Checked In At</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {attendanceRecords.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-500">
                        {loadingRecords ? 'Loading attendance stream...' : 'No attendance recorded for this session yet.'}
                      </td>
                    </tr>
                  ) : (
                    attendanceRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono font-semibold text-teal-400">
                          {rec.studentId}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-200">
                          {rec.studentName}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              rec.method === 'QR_SCAN'
                                ? 'bg-teal-950 text-teal-400 border border-teal-800/50'
                                : 'bg-indigo-950 text-indigo-400 border border-indigo-800/50'
                            }`}
                          >
                            {rec.method}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                          {rec.markedAt ? new Date(rec.markedAt).toLocaleTimeString() : '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-400 truncate max-w-xs text-[11px]">
                          {rec.justificationNotes || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 text-right text-[11px] text-slate-500">
            Showing {attendanceRecords.length} recorded attendances
          </div>
        </div>
      </div>

      {/* Manual Attendance Modal */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Manual Student Attendance"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Search for an enrolled student assigned to this session's expected cohort and provide a mandatory reason for manual check-in.
          </p>

          {/* Student Search */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Search Expected Student (ID or Name)
            </label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={manualSearchQuery}
                onChange={(e) => {
                  setManualSearchQuery(e.target.value);
                  fetchExpectedStudents(e.target.value);
                }}
                placeholder="e.g. IT21001234 or Kasun"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Expected Student Pick List */}
          <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800 bg-slate-950/60">
            {loadingStudents ? (
              <div className="p-4 text-center text-xs text-slate-400">Searching roster...</div>
            ) : expectedStudents.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">No matching enrolled students found.</div>
            ) : (
              expectedStudents.map((st) => (
                <div
                  key={st.studentUuid}
                  onClick={() => !st.isAttended && setSelectedStudentForManual(st)}
                  className={`p-3 flex items-center justify-between text-xs transition cursor-pointer ${
                    st.isAttended
                      ? 'bg-slate-900/30 opacity-60 cursor-not-allowed'
                      : selectedStudentForManual?.studentUuid === st.studentUuid
                      ? 'bg-teal-500/10 border-l-2 border-teal-400 text-teal-300'
                      : 'hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div>
                    <span className="font-mono font-semibold text-white mr-2">{st.studentId}</span>
                    <span>{st.studentName}</span>
                  </div>
                  <div>
                    {st.isAttended ? (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                        ALREADY PRESENT
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Select</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Selected Student Display */}
          {selectedStudentForManual && (
            <div className="p-3 bg-teal-950/40 border border-teal-500/30 rounded-xl text-xs">
              <span className="text-teal-400 font-semibold block">Selected Student:</span>
              <span className="text-white font-bold">{selectedStudentForManual.studentName}</span>{' '}
              <span className="font-mono text-teal-300">({selectedStudentForManual.studentId})</span>
            </div>
          )}

          {/* Mandatory Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Justification Reason <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={manualReason}
              onChange={(e) => setManualReason(e.target.value)}
              placeholder="e.g. Student badge QR unreadable / phone battery dead"
              rows="3"
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsManualModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={submitManualAttendance}
              disabled={submittingManual || !selectedStudentForManual || !manualReason.trim()}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition disabled:opacity-50"
            >
              {submittingManual ? 'Recording...' : 'Record Attendance'}
            </button>
          </div>
        </div>
      </Modal>

      {/* End Session Confirmation Modal */}
      <EndSessionModal
        isOpen={isEndSessionModalOpen}
        onClose={() => setIsEndSessionModalOpen(false)}
        session={session}
        counters={counters}
        attendancePercentage={attendancePercent ? `${attendancePercent}%` : undefined}
        onFinalize={handleFinalizeSession}
        onReviewRoster={() => {
          handleOpenManualModal();
        }}
        loading={finalizing}
      />
    </div>
  );
}
