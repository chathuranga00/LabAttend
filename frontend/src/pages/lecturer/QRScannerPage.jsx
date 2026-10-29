import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
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
  WifiOff,
  Volume2,
  VolumeX,
  Flashlight,
  RotateCcw,
  Loader2,
  Info,
  ChevronDown,
  ListFilter
} from 'lucide-react';
import { attendanceService } from '../../services/attendanceService';
import { sessionService } from '../../services/sessionService';
import { useToast } from '../../context/ToastContext';
import { usePwa } from '../../context/PwaContext';
import { useNotifications } from '../../context/NotificationContext';
import { Modal } from '../../components/common';
import EndSessionModal from '../../components/session/EndSessionModal';

/**
 * Lazy loader for html5-qrcode to keep the main bundle lightweight.
 * The library is imported only when the scanner route is active.
 */
let Html5QrcodeClass = null;
async function getHtml5Qrcode() {
  if (!Html5QrcodeClass) {
    const mod = await import('html5-qrcode');
    Html5QrcodeClass = mod.Html5Qrcode;
  }
  return Html5QrcodeClass;
}

/**
 * Web Audio API synthesizer for instant audio feedback without external audio files.
 */
function playScanSound(type, isMuted) {
  if (isMuted || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'SUCCESS') {
      // Pleasant high double chime (C5 -> E5)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === 'CROSS_GROUP_MARKED') {
      // Alert ascending chime (D5 -> G5)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.setValueAtTime(783.99, now + 0.09);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      osc.start(now);
      osc.stop(now + 0.26);
    } else if (type === 'ALREADY_MARKED') {
      // Soft double blip (440Hz -> 440Hz)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      gain.gain.setValueAtTime(0.12, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'ERROR') {
      // Low warning buzz (220Hz -> 160Hz)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(160, now + 0.25);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    }

    setTimeout(() => {
      try {
        ctx.close();
      } catch (e) {}
    }, 600);
  } catch (err) {
    // Non-fatal
  }
}

/**
 * Haptic vibration feedback using the Vibration API.
 */
function triggerVibration(type) {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    if (type === 'SUCCESS') {
      navigator.vibrate(100);
    } else if (type === 'CROSS_GROUP_MARKED') {
      navigator.vibrate([150, 80, 150]);
    } else if (type === 'ALREADY_MARKED') {
      navigator.vibrate([80, 50, 80]);
    } else if (type === 'ERROR') {
      navigator.vibrate([250, 80, 250]);
    }
  } catch (err) {
    // Non-fatal
  }
}

export default function QRScannerPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isOnline } = usePwa();
  const { addNotification } = useNotifications();

  const querySessionId = searchParams.get('sessionId');

  // Session state
  const [activeSessions, setActiveSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(querySessionId || '');
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(false);

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [cameraErrorType, setCameraErrorType] = useState(null); // 'permission' | 'notFound' | 'inUse' | 'insecure' | 'unsupported' | 'other'
  const html5QrCodeRef = useRef(null);
  const scanLockRef = useRef(false);
  const lastScannedPayloadRef = useRef(null);
  const lastScannedTimeRef = useRef(0);

  // Camera devices & hardware controls
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(() => {
    try {
      return localStorage.getItem('labattend_scanner_camera_id') || '';
    } catch {
      return '';
    }
  });
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorchSupport, setHasTorchSupport] = useState(false);

  // Sound mute state (persisted per device)
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem('labattend_scanner_muted') === 'true';
    } catch {
      return false;
    }
  });

  // Sending state and network retry
  const [isSending, setIsSending] = useState(false);
  const [failedToken, setFailedToken] = useState(null);

  // Screen Wake Lock reference
  const wakeLockRef = useRef(null);

  // Mobile Bottom Tab state: 'stream' | 'manual'
  const [mobileTab, setMobileTab] = useState('stream');

  // Counters state (from backend)
  const [counters, setCounters] = useState({
    expected: 0,
    present: 0,
    visitors: 0,
    remaining: 0,
  });

  // Last scan feedback state
  const [lastScanResult, setLastScanResult] = useState(null);

  // Attendance live list state
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [crossGroupOnly, setCrossGroupOnly] = useState(false);

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

  // Toggle Sound Mute
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    try {
      localStorage.setItem('labattend_scanner_muted', String(next));
    } catch (e) {}
    showToast(next ? 'Scanner sound muted' : 'Scanner sound unmuted', 'info');
  };

  // Screen Wake Lock API helpers
  const requestWakeLock = useCallback(async () => {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && navigator.wakeLock?.request) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {
          wakeLockRef.current = null;
        });
      } catch (err) {
        // Silently fail if wake lock request denied (e.g. low battery)
      }
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (err) {}
      wakeLockRef.current = null;
    }
  }, []);

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
      const [sessRes, sumRes] = await Promise.all([
        sessionService.getLecturerSessionById(id),
        sessionService.getSessionSummary(id).catch(() => null),
      ]);
      if (sessRes.success && sessRes.data) {
        const s = sessRes.data;
        setSession(s);
        if (sumRes && sumRes.success && sumRes.data) {
          const sum = sumRes.data;
          setCounters({
            expected: sum.expectedStudentCount || 0,
            present: sum.presentCount || 0,
            visitors: sum.crossGroupCount || 0,
            remaining: sum.unmarkedCount || 0,
          });
        } else {
          setCounters({
            expected: s.expectedStudentCount || 0,
            present: s.attendedCount || 0,
            visitors: 0,
            remaining: Math.max(0, (s.expectedStudentCount || 0) - (s.attendedCount || 0)),
          });
        }
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
  const fetchAttendanceRecords = useCallback(async (id, search = '', crossOnly = false) => {
    if (!id) return;
    try {
      setLoadingRecords(true);
      const params = {
        search: search.trim() || undefined,
        page: 0,
        size: 50,
      };
      if (crossOnly) {
        params.isCrossGroup = true;
      }
      const res = await attendanceService.getSessionAttendance(id, params);
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
      fetchAttendanceRecords(selectedSessionId, tableSearch, crossGroupOnly);
    }
  }, [selectedSessionId, tableSearch, crossGroupOnly, fetchAttendanceRecords]);

  // 4. Process QR Code Scan Payload
  const handleScanPayload = useCallback(async (identifier) => {
    if (!identifier || !selectedSessionId) return;

    // Check online status first: no offline queueing permitted
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      showToast('Cannot scan while offline. LabAttend requires a connection to verify attendance.', 'error');
      setLastScanResult({
        type: 'ERROR',
        title: 'Offline',
        message: 'Unable to connect to the server. Check your connection and try again.',
        rawIdentifier: identifier.trim(),
        time: new Date().toISOString(),
        isNetwork: true,
      });
      return;
    }

    const trimmed = identifier.trim();
    const now = Date.now();

    // Debounce: prevent sending the identical code within 2.5 seconds
    if (
      lastScannedPayloadRef.current === trimmed &&
      now - lastScannedTimeRef.current < 2500
    ) {
      return;
    }

    // Parallel send lock: prevent duplicate concurrent API requests
    if (scanLockRef.current) {
      return;
    }

    scanLockRef.current = true;
    lastScannedPayloadRef.current = trimmed;
    lastScannedTimeRef.current = now;
    setIsSending(true);
    setFailedToken(null);

    try {
      const res = await attendanceService.scanQr(selectedSessionId, trimmed);

      if (res && res.success && res.data) {
        const data = res.data;

        // Update counters directly from backend
        setCounters({
          expected: data.totalExpected,
          present: data.attendedCount,
          visitors: data.crossGroupCount || 0,
          remaining: data.remainingCount,
        });

        if (data.result === 'CROSS_GROUP_MARKED' || (data.result === 'SUCCESS' && data.isCrossGroup)) {
          const homeGroup = data.homeLabGroupName || data.labGroupName || 'Unassigned';
          const sessGroup = data.sessionLabGroupName || (session?.labGroupName) || 'This Group';
          setLastScanResult({
            type: 'CROSS_GROUP_MARKED',
            title: 'Cross-Group Attendance Marked',
            badge: `Cross-Group: Group ${homeGroup} -> Group ${sessGroup}`,
            message: data.message || `Student belongs to Group ${homeGroup} (this session is Group ${sessGroup})`,
            studentId: data.studentId,
            studentName: data.studentName,
            homeLabGroupName: homeGroup,
            sessionLabGroupName: sessGroup,
            labGroupName: homeGroup,
            time: data.scannedAt,
            method: data.method || 'QR_SCAN',
          });
          playScanSound('CROSS_GROUP_MARKED', isMuted);
          triggerVibration('CROSS_GROUP_MARKED');
          showToast(`Cross-Group: ${data.studentName} (Group ${homeGroup} -> Group ${sessGroup})`, 'warning');
          addNotification({
            title: 'Cross-Group Attendee Recorded',
            message: `${data.studentName} (${data.studentId}) from Group ${homeGroup} attended session ${session?.moduleCode || ''}.`,
            type: 'warning',
            category: 'attendance',
            link: `/lecturer/sessions/${selectedSessionId}/summary`,
            playSound: false,
          });
        } else if (data.result === 'SUCCESS') {
          setLastScanResult({
            type: 'SUCCESS',
            title: 'Attendance Recorded',
            message: data.message || 'Marked Present',
            studentId: data.studentId,
            studentName: data.studentName,
            labGroupName: data.labGroupName,
            time: data.scannedAt,
            method: data.method || 'QR_SCAN',
          });
          playScanSound('SUCCESS', isMuted);
          triggerVibration('SUCCESS');
          showToast(`Present: ${data.studentName} (${data.studentId})`, 'success');
        } else if (data.result === 'ALREADY_MARKED') {
          const isCross = data.isCrossGroup;
          const homeGroup = data.homeLabGroupName || data.labGroupName;
          const sessGroup = data.sessionLabGroupName || (session?.labGroupName);
          setLastScanResult({
            type: 'ALREADY_MARKED',
            title: 'Already Marked Present',
            badge: isCross ? `Cross-Group: Group ${homeGroup} -> Group ${sessGroup}` : null,
            message: `Previously verified at ${new Date(data.scannedAt).toLocaleTimeString()}`,
            studentId: data.studentId,
            studentName: data.studentName,
            homeLabGroupName: homeGroup,
            labGroupName: homeGroup,
            time: data.scannedAt,
            method: data.method || 'QR_SCAN',
          });
          playScanSound('ALREADY_MARKED', isMuted);
          triggerVibration('ALREADY_MARKED');
          showToast(`Already Marked: ${data.studentName} (${data.studentId})`, 'info');
        }

        // Refresh attendance table
        fetchAttendanceRecords(selectedSessionId, tableSearch, crossGroupOnly);
      } else {
        // Fallback if success flag not explicitly true
        setLastScanResult({
          type: 'ERROR',
          title: 'Scan Rejected',
          message: res?.message || 'Server did not verify this scan.',
          rawIdentifier: trimmed,
          time: new Date().toISOString(),
        });
        playScanSound('ERROR', isMuted);
        triggerVibration('ERROR');
      }
    } catch (err) {
      const isNetwork = err.isNetworkError || err.status === 0 || !navigator.onLine;
      const errorMsg = isNetwork
        ? 'Unable to connect to the server. Check your connection and try again.'
        : (err.message || 'Verification failed');

      setFailedToken(trimmed);
      setLastScanResult({
        type: 'ERROR',
        title: isNetwork ? 'Network Error' : (err.status === 400 || err.status === 404 ? 'Verification Denied' : 'Scan Rejected'),
        message: errorMsg,
        rawIdentifier: trimmed,
        time: new Date().toISOString(),
        isNetwork,
      });

      playScanSound('ERROR', isMuted);
      triggerVibration('ERROR');
      showToast(errorMsg, 'error');
    } finally {
      setIsSending(false);
      // Release lock after brief delay
      setTimeout(() => {
        scanLockRef.current = false;
      }, 800);
    }
  }, [selectedSessionId, tableSearch, crossGroupOnly, session, isMuted, fetchAttendanceRecords, showToast]);

  // Check hardware capabilities like torch
  const inspectTrackCapabilities = () => {
    try {
      const videoElem = document.querySelector('#qr-scanner-viewport video');
      if (videoElem && videoElem.srcObject) {
        const stream = videoElem.srcObject;
        const track = stream.getVideoTracks()[0];
        if (track && typeof track.getCapabilities === 'function') {
          const cap = track.getCapabilities();
          setHasTorchSupport(Boolean(cap && 'torch' in cap));
          return;
        }
      }
    } catch (e) {}
    setHasTorchSupport(false);
  };

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !isScanning) return;
    const nextTorch = !isTorchOn;
    try {
      if (typeof html5QrCodeRef.current.applyVideoConstraints === 'function') {
        await html5QrCodeRef.current.applyVideoConstraints({
          advanced: [{ torch: nextTorch }],
        });
        setIsTorchOn(nextTorch);
        return;
      }
      const videoElem = document.querySelector('#qr-scanner-viewport video');
      if (videoElem && videoElem.srcObject) {
        const track = videoElem.srcObject.getVideoTracks()[0];
        if (track) {
          await track.applyConstraints({
            advanced: [{ torch: nextTorch }],
          });
          setIsTorchOn(nextTorch);
        }
      }
    } catch (err) {
      console.warn('Torch toggle failed or not supported:', err);
      showToast('Torch/Flash is not supported on this camera', 'info');
    }
  };

  // 5. Start Camera
  const startCamera = async (targetCameraId = null) => {
    setCameraError(null);
    setCameraErrorType(null);
    setIsTorchOn(false);

    // Pre-flight check: Insecure Context
    if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setCameraError('Insecure Context — Mobile browsers require a secure HTTPS connection or localhost to access the camera API.');
      setCameraErrorType('insecure');
      return;
    }

    // Pre-flight check: Unsupported Browser
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Unsupported Browser — Your browser does not support the MediaDevices / Camera API. Please use Google Chrome or Apple Safari.');
      setCameraErrorType('unsupported');
      return;
    }

    try {
      const Html5Qrcode = await getHtml5Qrcode();

      // Enumerate available cameras if not yet done
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setAvailableCameras(devices);
          if (!selectedCameraId && !targetCameraId) {
            // Prefer rear camera if labeled, otherwise first device
            const rear = devices.find((d) => /back|rear|environment/i.test(d.label));
            const chosen = rear ? rear.id : devices[0].id;
            setSelectedCameraId(chosen);
            try {
              localStorage.setItem('labattend_scanner_camera_id', chosen);
            } catch (e) {}
          }
        }
      } catch (enumErr) {
        console.warn('Camera enumeration error:', enumErr);
      }

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
        // Continuous non-match frames ignored
      };

      // Sensible scan rate & responsive qrbox sizing for phones
      const config = {
        fps: 12,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const boxSize = Math.max(180, Math.floor(minEdge * 0.72));
          return { width: boxSize, height: boxSize };
        },
        aspectRatio: 1.0,
      };

      const camIdToUse = targetCameraId || selectedCameraId;
      const cameraConfig = camIdToUse ? { deviceId: { exact: camIdToUse } } : { facingMode: 'environment' };

      await html5QrCodeRef.current.start(
        cameraConfig,
        config,
        qrCodeSuccessCallback,
        qrCodeErrorCallback
      );

      setIsScanning(true);
      await requestWakeLock();

      // Delay check for torch support to allow stream initialization
      setTimeout(() => {
        inspectTrackCapabilities();
      }, 500);
    } catch (err) {
      console.error('Camera initialization error:', err);
      let userMsg = 'Unable to access camera. Please check your browser settings and try again.';
      let errType = 'other';

      const name = err.name || '';
      const msg = err.message || '';

      if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || msg.includes('Permission denied')) {
        userMsg = 'Camera Access Denied — Please grant camera permissions in your browser to scan badges.';
        errType = 'permission';
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || msg.includes('No device')) {
        userMsg = 'Camera Not Found — No compatible camera detected on this device. Use manual check-in instead.';
        errType = 'notFound';
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        userMsg = 'Camera In Use — The camera is currently being used by another application or tab.';
        errType = 'inUse';
      }

      setCameraError(userMsg);
      setCameraErrorType(errType);
      setIsScanning(false);
      releaseWakeLock();
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
      setIsTorchOn(false);
      releaseWakeLock();
    }
  };

  // Switch camera when multiple video input devices are available
  const handleSwitchCamera = async () => {
    if (availableCameras.length <= 1) return;
    const currentIndex = availableCameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCam = availableCameras[nextIndex];

    setSelectedCameraId(nextCam.id);
    try {
      localStorage.setItem('labattend_scanner_camera_id', nextCam.id);
    } catch (e) {}

    if (isScanning) {
      await stopCamera();
      setTimeout(() => {
        startCamera(nextCam.id);
      }, 250);
    }
  };

  // Lifecycle: tab visibility handling (stops stream if hidden > 30s to preserve battery; handles wake lock)
  useEffect(() => {
    let hiddenTimer = null;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        releaseWakeLock();
        // If hidden for more than 30 seconds, shut down stream
        hiddenTimer = setTimeout(() => {
          if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
            stopCamera();
          }
        }, 30000);
      } else if (document.visibilityState === 'visible') {
        if (hiddenTimer) {
          clearTimeout(hiddenTimer);
          hiddenTimer = null;
        }
        if (isScanning) {
          requestWakeLock();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      if (hiddenTimer) clearTimeout(hiddenTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isScanning, requestWakeLock, releaseWakeLock]);

  // Lifecycle: cleanup camera and wake lock on component unmount
  useEffect(() => {
    return () => {
      releaseWakeLock();
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [releaseWakeLock]);

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

      if (res.success && res.data) {
        const data = res.data;
        setCounters({
          expected: data.totalExpected,
          present: data.attendedCount,
          visitors: data.crossGroupCount || 0,
          remaining: data.remainingCount,
        });

        if (data.result === 'CROSS_GROUP_MARKED' || (data.result === 'SUCCESS' && data.isCrossGroup)) {
          const homeGroup = data.homeLabGroupName || data.labGroupName || 'Unassigned';
          const sessGroup = data.sessionLabGroupName || (session?.labGroupName) || 'This Group';
          setLastScanResult({
            type: 'CROSS_GROUP_MARKED',
            title: 'Cross-Group Attendance Recorded',
            badge: `Cross-Group: Group ${homeGroup} -> Group ${sessGroup}`,
            message: data.message || `Student belongs to Group ${homeGroup} (this session is Group ${sessGroup})`,
            studentId: data.studentId,
            studentName: data.studentName,
            homeLabGroupName: homeGroup,
            sessionLabGroupName: sessGroup,
            labGroupName: homeGroup,
            time: data.scannedAt,
            method: 'MANUAL',
          });
          playScanSound('CROSS_GROUP_MARKED', isMuted);
          triggerVibration('CROSS_GROUP_MARKED');
          showToast(`Cross-Group Recorded: ${data.studentName} (Group ${homeGroup} -> Group ${sessGroup})`, 'warning');
        } else if (data.result === 'SUCCESS') {
          setLastScanResult({
            type: 'SUCCESS',
            title: 'Manual Attendance Recorded',
            message: `Recorded manually: ${manualReason.trim()}`,
            studentId: data.studentId,
            studentName: data.studentName,
            labGroupName: data.labGroupName,
            time: data.scannedAt,
            method: 'MANUAL',
          });
          playScanSound('SUCCESS', isMuted);
          triggerVibration('SUCCESS');
          showToast(`Recorded: ${data.studentName}`, 'success');
        } else {
          setLastScanResult({
            type: 'ALREADY_MARKED',
            title: 'Already Marked Present',
            message: `Previously verified at ${new Date(data.scannedAt).toLocaleTimeString()}`,
            studentId: data.studentId,
            studentName: data.studentName,
            labGroupName: data.labGroupName,
            time: data.scannedAt,
            method: data.method,
          });
          playScanSound('ALREADY_MARKED', isMuted);
          triggerVibration('ALREADY_MARKED');
          showToast(`Student already present`, 'info');
        }

        setIsManualModalOpen(false);
        setSelectedStudentForManual(null);
        setManualReason('');
        fetchAttendanceRecords(selectedSessionId, tableSearch, crossGroupOnly);
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
        addNotification({
          title: 'Session Finalized',
          message: `Session ${session?.moduleCode || ''} finalized successfully. Absentee records sealed.`,
          type: 'success',
          category: 'session',
          link: `/lecturer/sessions/${selectedSessionId}/summary`,
        });
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-safe">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Link
            to="/lecturer/sessions"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span>My Lab Sessions</span>
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-xs sm:text-sm font-semibold text-teal-400">Badge Scanner Terminal</span>
        </div>

        {/* Top End Session Quick Action (if active) */}
        {session && session.status === 'ACTIVE' && (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setIsEndSessionModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-bold shadow-md shadow-rose-950/40 transition min-h-[44px]"
              aria-label="End Attendance Session"
            >
              <Clock className="h-4 w-4" />
              <span>End Session</span>
            </button>
          </div>
        )}
      </div>

      {/* Active Session Picker Bar (if multiple active or changing) */}
      {activeSessions.length > 1 && (
        <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="text-slate-400 font-medium">Switch Active Lab Session:</span>
          <select
            value={selectedSessionId}
            onChange={(e) => {
              setSelectedSessionId(e.target.value);
              setLastScanResult(null);
            }}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-semibold focus:outline-none focus:border-teal-500 min-h-[44px]"
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
          <h2 className="text-base sm:text-lg font-bold text-white">No Active Attendance Session Selected</h2>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            {session && session.status !== 'ACTIVE'
              ? `Session ${session.sessionCode} is currently ${session.status}. Attendance scanning is only permitted on ACTIVE sessions.`
              : 'You do not currently have an active laboratory session open for attendance.'}
          </p>
          <div className="pt-2">
            <Link
              to="/lecturer/sessions"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs transition min-h-[44px]"
            >
              <span>View Sessions & Start Lab</span>
            </Link>
          </div>
        </div>
      )}

      {/* Session Info Header (Desktop & Tablet) */}
      {session && (
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                <span className="font-mono font-bold text-teal-400 bg-teal-950/60 border border-teal-800/60 px-2.5 py-1 rounded text-xs">
                  {session.sessionCode}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  {session.status}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-2">
                {session.moduleCode} — {session.moduleName}
              </h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2.5 text-xs text-slate-300">
                <span className="flex items-center gap-1.5 bg-slate-800/70 px-2.5 py-1 rounded-lg">
                  <Users className="h-3.5 w-3.5 text-teal-400" />
                  <span>Cohort: <strong>{session.batchName}</strong></span>
                  {session.labGroupName ? (
                    <span className="ml-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-950 border border-indigo-700 text-indigo-300">
                      Group {session.labGroupName}
                    </span>
                  ) : (
                    <span className="ml-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-700 text-slate-300">
                      Whole Batch
                    </span>
                  )}
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

            {/* Quick Action Buttons */}
            <div className="hidden sm:flex flex-wrap items-center gap-3">
              <button
                onClick={handleOpenManualModal}
                disabled={session.status !== 'ACTIVE'}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition disabled:opacity-50 min-h-[44px]"
              >
                <FileEdit className="h-4 w-4 text-cyan-400" />
                <span>Manual Student Entry</span>
              </button>

              {session.status === 'ACTIVE' && (
                <button
                  onClick={() => setIsEndSessionModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950/40 transition min-h-[44px]"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>End Attendance Session</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Mobile phone column order vs Desktop 2-column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        
        {/* Left Column / Mobile Top: Viewfinder, Controls, Last Scan Card, Sticky Counters */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Camera Viewfinder Card */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3 sm:p-5 shadow-xl relative">
            
            {/* Viewfinder Header Controls */}
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
                  <Camera className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">Camera Viewfinder</h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400">Aim at student badge QR</p>
                </div>
              </div>

              {/* Hardware Quick Action Controls */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Mute/Sound Toggle Button */}
                <button
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Unmute scanner sound' : 'Mute scanner sound'}
                  className={`p-2 sm:px-2.5 sm:py-2 rounded-xl text-xs font-semibold border transition min-h-[40px] min-w-[40px] flex items-center justify-center ${
                    isMuted
                      ? 'bg-rose-950/60 border-rose-800/60 text-rose-300'
                      : 'bg-slate-800/80 border-slate-700/80 text-teal-400'
                  }`}
                  title={isMuted ? 'Unmute audio feedback' : 'Mute audio feedback'}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>

                {/* Torch / Flashlight Toggle (when supported) */}
                {isScanning && hasTorchSupport && (
                  <button
                    onClick={toggleTorch}
                    aria-label={isTorchOn ? 'Turn off camera torch' : 'Turn on camera torch'}
                    className={`p-2 sm:px-2.5 sm:py-2 rounded-xl text-xs font-semibold border transition min-h-[40px] min-w-[40px] flex items-center justify-center ${
                      isTorchOn
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-slate-800/80 border-slate-700/80 text-amber-300 hover:bg-slate-700'
                    }`}
                    title={isTorchOn ? 'Turn off torch' : 'Turn on torch'}
                  >
                    <Flashlight className="h-4 w-4" />
                  </button>
                )}

                {/* Flip Camera Toggle (when multiple cameras detected) */}
                {availableCameras.length > 1 && (
                  <button
                    onClick={handleSwitchCamera}
                    aria-label="Switch camera"
                    className="p-2 sm:px-2.5 sm:py-2 rounded-xl text-xs font-semibold border bg-slate-800/80 border-slate-700/80 text-slate-200 hover:bg-slate-700 transition min-h-[40px] min-w-[40px] flex items-center justify-center"
                    title="Switch camera device"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}

                {/* Start/Stop Camera Button */}
                {isScanning ? (
                  <button
                    onClick={stopCamera}
                    aria-label="Stop Camera"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 text-xs font-semibold transition min-h-[40px]"
                  >
                    <CameraOff className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Stop Camera</span>
                  </button>
                ) : (
                  <button
                    onClick={() => startCamera()}
                    disabled={!session || session.status !== 'ACTIVE'}
                    aria-label="Start Camera"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 text-xs font-bold shadow-lg shadow-teal-500/20 transition disabled:opacity-50 min-h-[40px]"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Start Camera</span>
                  </button>
                )}
              </div>
            </div>

            {/* Viewport Frame */}
            <div className="relative w-full aspect-[4/3] sm:aspect-square bg-slate-950 rounded-xl border-2 border-dashed border-slate-800 overflow-hidden flex flex-col items-center justify-center">
              {/* html5-qrcode video viewport mounting point */}
              <div id="qr-scanner-viewport" className="w-full h-full" />

              {/* Offline Overlay State */}
              {!isOnline && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-slate-950/95 space-y-2">
                  <WifiOff className="h-10 w-10 text-amber-400 animate-pulse" />
                  <h4 className="text-sm font-bold text-white">Scanning Paused — Offline</h4>
                  <p className="text-xs text-amber-300 max-w-xs">
                    LabAttend requires an active internet connection to record attendance. Scanning will resume once connection returns.
                  </p>
                </div>
              )}

              {/* Inactive Camera State */}
              {!isScanning && !cameraError && isOnline && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 pointer-events-none">
                  <div className="h-14 w-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3 text-teal-400">
                    <QrCode className="h-7 w-7" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">Camera Feed Inactive</h4>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Tap "Start Camera" to begin scanning student badges.
                  </p>
                </div>
              )}

              {/* Camera Error Message with Section 25 & Browser Permission Help */}
              {cameraError && isOnline && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-slate-950/95 space-y-2.5 overflow-y-auto">
                  <AlertCircle className="h-8 w-8 text-rose-400 shrink-0" />
                  <p className="text-xs text-rose-300 font-semibold px-2 max-w-sm">
                    {cameraError}
                  </p>

                  {/* Browser Permission Help for Android Chrome & iOS Safari */}
                  {cameraErrorType === 'permission' && (
                    <div className="text-left bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 text-[11px] text-slate-300 space-y-1.5 max-w-xs mx-auto">
                      <p className="font-bold text-amber-400 flex items-center gap-1">
                        <Info className="h-3 w-3" /> How to enable camera:
                      </p>
                      <p><strong>Android Chrome:</strong> Tap lock/tune icon near URL &gt; Permissions &gt; Camera &gt; Allow, then refresh.</p>
                      <p><strong>iOS Safari:</strong> Tap 'aA' or lock in URL bar &gt; Website Settings &gt; Camera &gt; Allow, then refresh.</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => startCamera()}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition min-h-[44px]"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={handleOpenManualModal}
                      className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 text-xs font-bold transition min-h-[44px]"
                    >
                      Use Manual Check-In
                    </button>
                  </div>
                </div>
              )}

              {/* Scanning Active Overlay Crosshairs */}
              {isScanning && isOnline && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-3">
                  <div className="w-full flex justify-between items-center text-[10px] text-teal-400 bg-slate-900/85 px-2.5 py-1 rounded-md backdrop-blur border border-teal-500/20">
                    <span className="flex items-center gap-1.5 font-bold">
                      <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
                      LIVE BADGE SCANNER
                    </span>
                    <span>Align QR code in center</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Last Scanned Student Feedback Card (Visual Confirmation) */}
          <div 
            className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xl transition-all"
            aria-live="assertive"
          >
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Last Scanned Badge Status
              </h3>
              {isSending && (
                <span className="inline-flex items-center gap-1.5 text-xs text-teal-400 font-semibold animate-pulse">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Verifying scan...</span>
                </span>
              )}
            </div>

            {/* Empty State */}
            {!lastScanResult && (
              <div className="p-4 sm:p-5 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl space-y-1">
                <p className="font-semibold text-slate-300">Ready to scan badges</p>
                <p className="text-[11px] text-slate-500">Hold student badge QR code within the frame for real-time visual confirmation.</p>
              </div>
            )}

            {/* Success Card: Regular Present */}
            {lastScanResult && lastScanResult.type === 'SUCCESS' && (
              <div className="p-4 bg-emerald-950/50 border border-emerald-500/60 rounded-xl space-y-2 shadow-lg shadow-emerald-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <span>{lastScanResult.title}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {lastScanResult.method}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    {lastScanResult.studentName}
                  </div>
                  {lastScanResult.labGroupName ? (
                    <span className="font-mono text-xs font-bold text-emerald-300 bg-emerald-900/60 border border-emerald-700/60 px-2.5 py-0.5 rounded-full shrink-0">
                      Group {lastScanResult.labGroupName}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 shrink-0">No Group</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-emerald-200 pt-1 border-t border-emerald-800/40">
                  <span className="font-mono bg-emerald-900/70 px-2 py-0.5 rounded border border-emerald-700/50 font-bold">
                    {lastScanResult.studentId}
                  </span>
                  <span className="text-[11px] text-emerald-300/80">
                    {lastScanResult.time ? new Date(lastScanResult.time).toLocaleTimeString() : ''}
                  </span>
                </div>
              </div>
            )}

            {/* Cross-Group Card: Amber alert */}
            {lastScanResult && lastScanResult.type === 'CROSS_GROUP_MARKED' && (
              <div className="p-4 bg-amber-950/50 border border-amber-500/70 rounded-xl space-y-2.5 shadow-lg shadow-amber-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <span>{lastScanResult.title}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {lastScanResult.method}
                  </span>
                </div>
                {lastScanResult.badge && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/25 border border-amber-500/50 text-amber-200 text-xs font-bold">
                    <span>{lastScanResult.badge}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <div className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    {lastScanResult.studentName}
                  </div>
                  <span className="font-mono text-xs font-bold text-amber-300 bg-amber-900/70 border border-amber-600/70 px-2.5 py-0.5 rounded-full shrink-0">
                    Own: Group {lastScanResult.homeLabGroupName || lastScanResult.labGroupName || '—'}
                  </span>
                </div>
                <p className="text-xs text-amber-200/90 font-medium">
                  {lastScanResult.message}
                </p>
                <div className="flex items-center justify-between text-xs text-amber-200 pt-1 border-t border-amber-800/40">
                  <span className="font-mono bg-amber-900/70 px-2 py-0.5 rounded border border-amber-700/60 font-bold">
                    {lastScanResult.studentId}
                  </span>
                  <span className="text-[11px] text-amber-300/80">
                    {lastScanResult.time ? new Date(lastScanResult.time).toLocaleTimeString() : ''}
                  </span>
                </div>
              </div>
            )}

            {/* Already Marked Card: Blue warning */}
            {lastScanResult && lastScanResult.type === 'ALREADY_MARKED' && (
              <div className="p-4 bg-sky-950/50 border border-sky-500/60 rounded-xl space-y-2 shadow-lg shadow-sky-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span>{lastScanResult.title}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
                    DUPLICATE
                  </span>
                </div>
                {lastScanResult.badge && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-500/20 border border-sky-500/40 text-sky-300">
                    <span>{lastScanResult.badge}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <div className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    {lastScanResult.studentName}
                  </div>
                  {lastScanResult.homeLabGroupName || lastScanResult.labGroupName ? (
                    <span className="font-mono text-xs font-bold text-sky-300 bg-sky-900/60 border border-sky-700/60 px-2.5 py-0.5 rounded-full shrink-0">
                      Group {lastScanResult.homeLabGroupName || lastScanResult.labGroupName}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 shrink-0">No Group</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-sky-200 pt-1 border-t border-sky-800/40">
                  <span className="font-mono bg-sky-900/70 px-2 py-0.5 rounded border border-sky-700/60 font-bold">
                    {lastScanResult.studentId}
                  </span>
                  <span className="text-xs text-sky-300">{lastScanResult.message}</span>
                </div>
              </div>
            )}

            {/* Error Card: Red rejection */}
            {lastScanResult && lastScanResult.type === 'ERROR' && (
              <div className="p-4 bg-rose-950/50 border border-rose-500/60 rounded-xl space-y-2 shadow-lg shadow-rose-950/20">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <XCircle className="h-5 w-5 shrink-0" />
                  <span>{lastScanResult.title}</span>
                </div>
                <p className="text-xs text-rose-200 font-medium">
                  {lastScanResult.message}
                </p>
                {lastScanResult.rawIdentifier && (
                  <div className="text-[11px] font-mono text-rose-400 bg-rose-900/40 px-2 py-1 rounded border border-rose-800/50">
                    Scanned: {lastScanResult.rawIdentifier}
                  </div>
                )}

                {/* Retry Button on Network Error */}
                {lastScanResult.isNetwork && failedToken && (
                  <button
                    onClick={() => handleScanPayload(failedToken)}
                    disabled={isSending || !isOnline}
                    className="w-full mt-2 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 transition disabled:opacity-50 min-h-[44px]"
                  >
                    <RotateCcw className={`h-4 w-4 ${isSending ? 'animate-spin' : ''}`} />
                    <span>{isSending ? 'Retrying verification...' : 'Retry Scan'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sticky Counters Strip */}
          <div className="sticky top-14 z-20 bg-slate-950/95 backdrop-blur-md py-2 px-3 rounded-2xl border border-slate-800 shadow-xl">
            <div className="grid grid-cols-4 gap-2 text-center">
              {/* Expected */}
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Expected</span>
                <span className="text-base sm:text-xl font-extrabold text-white">{counters.expected}</span>
              </div>
              {/* Present */}
              <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-900/50">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">Present</span>
                <span className="text-base sm:text-xl font-extrabold text-emerald-400">{counters.present}</span>
              </div>
              {/* Visitors */}
              <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-900/50">
                <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">Visitors</span>
                <span className="text-base sm:text-xl font-extrabold text-amber-400">{counters.visitors}</span>
              </div>
              {/* Remaining */}
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Remaining</span>
                <span className="text-base sm:text-xl font-extrabold text-slate-300">{counters.remaining}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column / Mobile Bottom: Tabbed Layout (Live Attendance Stream / Manual Check-In) */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            {/* Tab Navigation Header on Small Screens & Desktop Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              
              {/* Tab Switcher Buttons */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  onClick={() => setMobileTab('stream')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 min-h-[40px] ${
                    mobileTab === 'stream'
                      ? 'bg-teal-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Live Stream ({attendanceRecords.length})</span>
                </button>

                <button
                  onClick={() => {
                    setMobileTab('manual');
                    fetchExpectedStudents('');
                  }}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 min-h-[40px] ${
                    mobileTab === 'manual'
                      ? 'bg-teal-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileEdit className="h-3.5 w-3.5" />
                  <span>Manual Fallback</span>
                </button>
              </div>

              {/* End Session Button for Mobile */}
              {session && session.status === 'ACTIVE' && (
                <button
                  onClick={() => setIsEndSessionModalOpen(true)}
                  className="sm:hidden w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-bold text-xs shadow-md shadow-rose-950/40 transition flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>End Attendance Session</span>
                </button>
              )}
            </div>

            {/* TAB 1: Live Attendance Stream */}
            {mobileTab === 'stream' && (
              <div className="space-y-3 pt-3">
                {/* Search & Filter Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <div className="relative flex-1">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        placeholder="Search attendee by ID or name..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 min-h-[44px]"
                      />
                    </div>

                    {/* Cross-Group Only Filter Toggle */}
                    <button
                      onClick={() => setCrossGroupOnly(!crossGroupOnly)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition shrink-0 min-h-[44px] flex items-center gap-1.5 ${
                        crossGroupOnly
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                          : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                      title="Filter to show only cross-group attendees"
                    >
                      <ListFilter className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Cross-group</span>
                    </button>

                    {/* Refresh Button */}
                    <button
                      onClick={() => fetchAttendanceRecords(selectedSessionId, tableSearch, crossGroupOnly)}
                      aria-label="Refresh attendance records"
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Refresh attendance records"
                    >
                      <RefreshCw className={`h-4 w-4 ${loadingRecords ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Table & Mobile Stacked Cards */}
                <div className="rounded-xl border border-slate-800 overflow-hidden">
                  {/* Mobile Stacked Cards (< 768px) */}
                  <div className="md:hidden divide-y divide-slate-800/80 max-h-[380px] overflow-y-auto">
                    {attendanceRecords.length === 0 ? (
                      <div className="py-8 text-center text-slate-500 text-xs">
                        {loadingRecords ? 'Loading attendance stream...' : 'No attendance recorded for this session yet.'}
                      </div>
                    ) : (
                      attendanceRecords.map((rec) => (
                        <div key={rec.id} className="p-3.5 space-y-2 bg-slate-900/40">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-mono font-bold text-teal-400 text-xs">{rec.studentId}</span>
                              <p className="text-xs font-semibold text-slate-200 mt-0.5">{rec.studentName}</p>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                rec.method === 'QR_SCAN'
                                  ? 'bg-teal-950 text-teal-400 border border-teal-800/50'
                                  : 'bg-indigo-950 text-indigo-400 border border-indigo-800/50'
                              }`}
                            >
                              {rec.method}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/40">
                            <div>
                              {rec.isCrossGroup ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700/60 inline-flex items-center gap-1">
                                  <span>Cross-Group</span>
                                  <span className="text-amber-400 font-normal">({rec.homeLabGroupName ? `Group ${rec.homeLabGroupName}` : 'Other'})</span>
                                </span>
                              ) : (
                                <span className="text-slate-300 font-mono text-[11px]">
                                  {rec.homeLabGroupName || rec.labGroupName || (session?.labGroupName ? `Group ${session.labGroupName}` : 'Whole Batch')}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {rec.markedAt ? new Date(rec.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Desktop Table (>= 768px) */}
                  <div className="hidden md:block overflow-x-auto max-h-[420px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px] tracking-wider sticky top-0 z-10">
                        <tr>
                          <th className="py-3 px-4">Student ID</th>
                          <th className="py-3 px-4">Student Name</th>
                          <th className="py-3 px-4">Home Group</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Method</th>
                          <th className="py-3 px-4">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {attendanceRecords.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="py-8 text-center text-slate-500">
                              {loadingRecords ? 'Loading attendance stream...' : 'No attendance recorded for this session yet.'}
                            </td>
                          </tr>
                        ) : (
                          attendanceRecords.map((rec) => (
                            <tr key={rec.id} className="hover:bg-slate-800/40 transition">
                              <td className="py-3 px-4 font-mono font-semibold text-teal-400">
                                {rec.studentId}
                              </td>
                              <td className="py-3 px-4 text-slate-200 font-medium">
                                {rec.studentName}
                              </td>
                              <td className="py-3 px-4 text-slate-400">
                                {rec.homeLabGroupName || rec.labGroupName || (session?.labGroupName ? `Group ${session.labGroupName}` : 'Whole Batch')}
                              </td>
                              <td className="py-3 px-4">
                                {rec.isCrossGroup ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800/60 inline-flex items-center gap-1">
                                    <span>Cross-Group</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                                    Regular
                                  </span>
                                )}
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
                              <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                                {rec.markedAt ? new Date(rec.markedAt).toLocaleTimeString() : '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="pt-2 text-right text-[11px] text-slate-500">
                  Showing {attendanceRecords.length} recorded attendances
                </div>
              </div>
            )}

            {/* TAB 2: Manual Fallback Search */}
            {mobileTab === 'manual' && (
              <div className="space-y-3 pt-3">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400">
                  Search the enrolled roster to manually record attendance with a required justification reason.
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={manualSearchQuery}
                    onChange={(e) => {
                      setManualSearchQuery(e.target.value);
                      fetchExpectedStudents(e.target.value);
                    }}
                    placeholder="Search expected student (ID or name)..."
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 min-h-[44px]"
                  />
                </div>

                {/* Expected Student Pick List (Big touch targets >= 44px) */}
                <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800 bg-slate-950/60">
                  {loadingStudents ? (
                    <div className="p-4 text-center text-xs text-slate-400">Searching roster...</div>
                  ) : expectedStudents.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">No matching enrolled students found.</div>
                  ) : (
                    expectedStudents.map((st) => (
                      <div
                        key={st.studentUuid}
                        onClick={() => !st.isAttended && setSelectedStudentForManual(st)}
                        className={`p-3 min-h-[44px] flex items-center justify-between text-xs transition cursor-pointer ${
                          st.isAttended
                            ? 'bg-slate-900/30 opacity-60 cursor-not-allowed'
                            : selectedStudentForManual?.studentUuid === st.studentUuid
                            ? 'bg-teal-500/15 border-l-4 border-teal-400 text-teal-200'
                            : 'hover:bg-slate-800/60 text-slate-300'
                        }`}
                      >
                        <div>
                          <span className="font-mono font-bold text-white mr-2">{st.studentId}</span>
                          <span>{st.studentName}</span>
                        </div>
                        <div>
                          {st.isAttended ? (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                              ALREADY PRESENT
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-teal-400 bg-teal-950/40 border border-teal-800/40 px-2.5 py-1 rounded">
                              Select
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Selected Student Display */}
                {selectedStudentForManual && (
                  <div className="p-3 bg-teal-950/40 border border-teal-500/40 rounded-xl text-xs">
                    <span className="text-teal-400 font-semibold block">Selected for Check-in:</span>
                    <span className="text-white font-bold text-sm">{selectedStudentForManual.studentName}</span>{' '}
                    <span className="font-mono text-teal-300">({selectedStudentForManual.studentId})</span>
                  </div>
                )}

                {/* Mandatory Justification Reason */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Justification Reason <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    value={manualReason}
                    onChange={(e) => setManualReason(e.target.value)}
                    placeholder="e.g. Student badge unreadable / camera glare"
                    rows="2"
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 resize-none min-h-[44px]"
                  />
                </div>

                {/* Action Button */}
                <div className="pt-1">
                  <button
                    onClick={submitManualAttendance}
                    disabled={submittingManual || !selectedStudentForManual || !manualReason.trim()}
                    className="w-full py-3 px-4 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
                  >
                    {submittingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    <span>{submittingManual ? 'Recording attendance...' : 'Record Manual Attendance'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Attendance Modal (Also available from header button) */}
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
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 min-h-[44px]"
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
                  className={`p-3 min-h-[44px] flex items-center justify-between text-xs transition cursor-pointer ${
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
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 resize-none min-h-[44px]"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsManualModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition min-h-[44px]"
            >
              Cancel
            </button>
            <button
              onClick={submitManualAttendance}
              disabled={submittingManual || !selectedStudentForManual || !manualReason.trim()}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition disabled:opacity-50 min-h-[44px]"
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
