import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  CalendarClock, 
  ArrowLeft, 
  BookOpen, 
  Calendar, 
  Building, 
  Clock, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { sessionService } from '../../services/sessionService';
import { useToast } from '../../context/ToastContext';

const formatGroupName = (name) => {
  if (!name) return '';
  return name.toLowerCase().startsWith('group ') ? name : `Group ${name}`;
};

export default function CreateLabSessionPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [formOptions, setFormOptions] = useState({ modules: [], halls: [] });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    moduleId: '',
    batchId: '',
    labGroupId: '',
    hallId: '',
    sessionDate: '',
    startTime: '09:00',
    endTime: '12:00',
  });

  const [formErrors, setFormErrors] = useState({});

  // Minimum date today in Asia/Colombo
  const todayStr = new Date().toISOString().split('T')[0];

  const fetchOptions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await sessionService.getFormOptions();
      if (res.success && res.data) {
        setFormOptions(res.data);

        // Pre-select first module and its first batch if available
        if (res.data.modules && res.data.modules.length > 0) {
          const firstMod = res.data.modules[0];
          const firstBatch = firstMod.batches && firstMod.batches.length > 0 ? firstMod.batches[0] : null;
          const firstHall = res.data.halls && res.data.halls.length > 0 ? res.data.halls[0] : null;

          setFormData((prev) => ({
            ...prev,
            moduleId: firstMod.moduleId,
            batchId: firstBatch ? firstBatch.batchId : '',
            labGroupId: '', // Default to Whole Batch (teach all)
            hallId: firstHall ? firstHall.hallId : '',
            sessionDate: todayStr,
          }));
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to load authorized courses and halls', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, todayStr]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  // Available batches and groups for selected module
  const selectedModuleObj = formOptions.modules.find((m) => m.moduleId === formData.moduleId);
  const availableBatches = selectedModuleObj ? selectedModuleObj.batches || [] : [];
  const selectedBatchObj = availableBatches.find((b) => b.batchId === formData.batchId);
  const availableGroups = selectedBatchObj ? selectedBatchObj.groups || [] : [];
  const isWholeBatchAllowed = selectedBatchObj ? selectedBatchObj.isWholeBatchAssigned : false;
  const selectedGroupObj = availableGroups.find((g) => g.groupId === formData.labGroupId);
  const selectedHallObj = formOptions.halls.find((h) => h.hallId === formData.hallId);

  const expectedStudentCount = selectedGroupObj
    ? selectedGroupObj.studentCount
    : selectedBatchObj
    ? selectedBatchObj.enrolledStudentCount
    : 0;

  const handleModuleChange = (e) => {
    const modId = e.target.value;
    const modObj = formOptions.modules.find((m) => m.moduleId === modId);
    const firstB = modObj && modObj.batches?.length > 0 ? modObj.batches[0] : null;
    setFormData((prev) => ({
      ...prev,
      moduleId: modId,
      batchId: firstB ? firstB.batchId : '',
      labGroupId: '', // Default to Whole Batch (teach all)
    }));
  };

  const handleBatchChange = (e) => {
    const bId = e.target.value;
    setFormData((prev) => ({
      ...prev,
      batchId: bId,
      labGroupId: '', // Default to Whole Batch (teach all)
    }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.moduleId) errs.moduleId = 'Please select an authorized module';
    if (!formData.batchId) errs.batchId = 'Please select an authorized batch cohort';
    // Lab Group is optional: empty represents Whole Batch (Teach All)
    if (!formData.hallId) errs.hallId = 'Please select a laboratory hall';
    if (!formData.sessionDate) {
      errs.sessionDate = 'Session date is required';
    } else if (formData.sessionDate < todayStr) {
      errs.sessionDate = 'Session date cannot be in the past';
    }

    if (!formData.startTime) errs.startTime = 'Start time is required';
    if (!formData.endTime) {
      errs.endTime = 'End time is required';
    } else if (formData.startTime && formData.endTime <= formData.startTime) {
      errs.endTime = 'End time must be strictly after start time';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      const payload = {
        moduleId: formData.moduleId,
        batchId: formData.batchId,
        labGroupId: formData.labGroupId || null,
        hallId: formData.hallId,
        sessionDate: formData.sessionDate,
        startTime: formData.startTime.length === 5 ? `${formData.startTime}:00` : formData.startTime,
        endTime: formData.endTime.length === 5 ? `${formData.endTime}:00` : formData.endTime,
      };

      const res = await sessionService.createSession(payload);
      if (res.success && res.data) {
        showToast('Lab session created successfully in DRAFT state!', 'success');
        navigate(`/lecturer/sessions/${res.data.id}`);
      }
    } catch (err) {
      showToast(err.message || 'Failed to create laboratory session', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400">Loading authorized faculty assignments...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/lecturer/sessions"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to My Sessions</span>
        </Link>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-teal-400 font-semibold tracking-wider uppercase mb-1">
          <CalendarClock className="h-4 w-4" />
          <span>Session Scheduling Engine</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Schedule New Laboratory Session</h1>
        <p className="text-sm text-slate-400 mt-1">
          Authorized Course Selection: You can only schedule sessions for modules and batches formally assigned to you by Administration.
        </p>
      </div>

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        {formOptions.modules.length === 0 ? (
          <div className="p-6 bg-amber-950/30 border border-amber-800/40 rounded-xl text-amber-300 text-sm flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <span className="font-bold block">No Assigned Modules Found</span>
              You currently have no active course-batch assignments. Please contact your Department Administrator to assign you to a module and cohort.
            </div>
          </div>
        ) : (
          <>
            {/* Module & Batch Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Authorized Course / Module *
                </label>
                <select
                  value={formData.moduleId}
                  onChange={handleModuleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                >
                  <option value="">Select an assigned module</option>
                  {formOptions.modules.map((m) => (
                    <option key={m.moduleId} value={m.moduleId}>
                      {m.moduleCode} — {m.moduleName}
                    </option>
                  ))}
                </select>
                {formErrors.moduleId && (
                  <span className="text-xs text-rose-400 mt-1 block">{formErrors.moduleId}</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Assigned Batch Cohort *
                </label>
                <select
                  value={formData.batchId}
                  onChange={handleBatchChange}
                  disabled={availableBatches.length === 0}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-teal-500 disabled:opacity-50"
                >
                  <option value="">Select an authorized batch</option>
                  {availableBatches.map((b) => (
                    <option key={b.batchId} value={b.batchId}>
                      {b.batchCode} ({b.academicYear || 'Current Year'})
                    </option>
                  ))}
                </select>
                {formErrors.batchId && (
                  <span className="text-xs text-rose-400 mt-1 block">{formErrors.batchId}</span>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Target Lab Group
                  </label>
                  {availableGroups.length > 0 ? (
                    <span className="text-[11px] font-medium text-teal-400 bg-teal-950/60 border border-teal-800/40 px-2 py-0.5 rounded-md">
                      {availableGroups.length} Subgroups Available (Select Group or Teach All)
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-md">
                      Whole Cohort (No Subgroups)
                    </span>
                  )}
                </div>

                {/* Quick group selector pills for active lecturer interaction */}
                {availableGroups.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, labGroupId: '' }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        !formData.labGroupId
                          ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30 ring-2 ring-teal-400'
                          : 'bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700/80'
                      }`}
                    >
                      All Groups / Whole Batch ({selectedBatchObj?.enrolledStudentCount || 0})
                    </button>
                    {availableGroups.map((g) => (
                      <button
                        key={g.groupId}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, labGroupId: g.groupId }))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                          formData.labGroupId === g.groupId
                            ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30 ring-2 ring-teal-400'
                            : 'bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700/80'
                        }`}
                      >
                        {formatGroupName(g.groupName)} ({g.studentCount})
                      </button>
                    ))}
                  </div>
                )}

                <select
                  value={formData.labGroupId}
                  onChange={(e) => setFormData({ ...formData, labGroupId: e.target.value })}
                  disabled={availableBatches.length === 0}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-teal-500 disabled:opacity-50"
                >
                  <option value="">
                    {availableGroups.length > 0
                      ? `All Groups / Whole Batch (${selectedBatchObj?.enrolledStudentCount || 0} students) — Teach All`
                      : `Whole Batch (${selectedBatchObj?.enrolledStudentCount || 0} students) — Teach All`}
                  </option>
                  {availableGroups.map((g) => (
                    <option key={g.groupId} value={g.groupId}>
                      {formatGroupName(g.groupName)} ({g.studentCount} students)
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  {availableGroups.length > 0
                    ? 'This batch has groups. You can select an individual lab group or choose "Teach All" to conduct for the whole cohort.'
                    : 'Session targets all enrolled active students in this batch.'}
                </p>
                {formErrors.labGroupId && (
                  <span className="text-xs text-rose-400 mt-1 block">{formErrors.labGroupId}</span>
                )}
              </div>
            </div>

            {/* Expected Student Count Live Preview Card */}
            {selectedBatchObj && (
              <div className="p-4 bg-teal-950/30 border border-teal-800/40 rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-teal-400 block uppercase tracking-wider">
                      Expected Student Roster Preview
                    </span>
                    <span className="text-xs text-slate-300">
                      {selectedGroupObj ? (
                        <>Enrolled active students in <strong className="text-white">{formatGroupName(selectedGroupObj.groupName)}</strong> ({selectedBatchObj.batchCode})</>
                      ) : (
                        <>Enrolled active students in <strong className="text-white">All Groups / Whole Batch</strong> ({selectedBatchObj.batchCode})</>
                      )}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-teal-400 font-mono">
                    {expectedStudentCount}
                  </span>
                  <span className="text-[11px] text-slate-400 block">students</span>
                </div>
              </div>
            )}

            {/* Hall Selection & Hall Capacity Preview */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Active Laboratory Hall *
              </label>
              <select
                value={formData.hallId}
                onChange={(e) => setFormData({ ...formData, hallId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-teal-500"
              >
                <option value="">Select a laboratory hall</option>
                {formOptions.halls.map((h) => (
                  <option key={h.hallId} value={h.hallId}>
                    {h.hallCode} — {h.name} (Capacity: {h.capacity} seats, {h.location || 'Main Lab'})
                  </option>
                ))}
              </select>
              {selectedHallObj && selectedBatchObj && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  {selectedHallObj.capacity >= expectedStudentCount ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Hall capacity ({selectedHallObj.capacity}) comfortably accommodates target attendance size ({expectedStudentCount}).
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Warning: Hall capacity ({selectedHallObj.capacity}) is lower than the target group/batch size ({expectedStudentCount}).
                    </span>
                  )}
                </div>
              )}
              {formErrors.hallId && (
                <span className="text-xs text-rose-400 mt-1 block">{formErrors.hallId}</span>
              )}
            </div>

            {/* Date and Time Pickers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Session Date (Asia/Colombo) *
                </label>
                <input
                  type="date"
                  min={todayStr}
                  value={formData.sessionDate}
                  onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-teal-500 font-mono"
                />
                {formErrors.sessionDate && (
                  <span className="text-xs text-rose-400 mt-1 block">{formErrors.sessionDate}</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Start Time *
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-teal-500 font-mono"
                />
                {formErrors.startTime && (
                  <span className="text-xs text-rose-400 mt-1 block">{formErrors.startTime}</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  End Time *
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-teal-500 font-mono"
                />
                {formErrors.endTime && (
                  <span className="text-xs text-rose-400 mt-1 block">{formErrors.endTime}</span>
                )}
              </div>
            </div>

            {/* Conflict Prevention Note */}
            <div className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-xl text-xs text-slate-400 space-y-1">
              <span className="font-semibold text-slate-300 block">Automated Conflict Detection:</span>
              <p>
                The system will mathematically verify that neither the selected laboratory hall nor your teaching schedule has an overlapping session before creation.
              </p>
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Link
                to="/lecturer/sessions"
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 disabled:opacity-50 text-slate-950 rounded-xl text-sm font-bold shadow-lg shadow-teal-500/20 transition"
              >
                {submitting ? 'Creating Lab Session...' : 'Create Lab Session'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
