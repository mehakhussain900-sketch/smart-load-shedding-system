import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { useTelemetry } from '../../hooks/useTelemetry';
import { api } from '../../services/api';
import type { SolarTelemetry } from '../../types/telemetry';
import {
  Download,
  Filter,
  Search,
  ArrowUpDown,
  FileSpreadsheet,
  AlertCircle,
  Database,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const DataLogsPage: React.FC = () => {
  const { isSimulating, setSimulating, history: localBuffer } = useTelemetry();
  const [activeSource, setActiveSource] = useState<'real' | 'simulated'>(
    isSimulating ? 'simulated' : 'real'
  );
  const [logs, setLogs] = useState<SolarTelemetry[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(25);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<'timestamp' | 'power' | 'voltage' | 'temperature'>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState<boolean>(true);

  // Sync activeSource when global isSimulating changes
  useEffect(() => {
    setActiveSource(isSimulating ? 'simulated' : 'real');
  }, [isSimulating]);

  // Fetch telemetry logs from backend
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const isSim = activeSource === 'simulated';
      const res = await api.getTelemetryHistory({
        limit: pageSize,
        offset: page * pageSize,
        is_simulated: isSim,
      });

      if (res && res.items.length > 0) {
        setLogs(res.items);
        setTotalRecords(res.total);
      } else if (isSim && localBuffer.length > 0) {
        // Fallback to local simulated memory buffer if backend simulated table is sparse
        setLogs(localBuffer.slice(page * pageSize, (page + 1) * pageSize));
        setTotalRecords(localBuffer.length);
      } else {
        setLogs([]);
        setTotalRecords(0);
      }
    } catch {
      // Offline fallback: if backend is unreachable, use local in-memory buffer
      if (activeSource === 'simulated' && localBuffer.length > 0) {
        setLogs(localBuffer.slice(page * pageSize, (page + 1) * pageSize));
        setTotalRecords(localBuffer.length);
      } else {
        setLogs([]);
        setTotalRecords(0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [activeSource, page, pageSize]);

  // Filtered and sorted rows for display
  const displayLogs = useMemo(() => {
    let result = [...logs];

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          r.timestamp.toLowerCase().includes(q) ||
          r.deviceId.toLowerCase().includes(q) ||
          r.power.toString().includes(q) ||
          r.voltage.toString().includes(q) ||
          r.temperature.toString().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      let valA = a[sortField] ?? 0;
      let valB = b[sortField] ?? 0;
      if (sortField === 'timestamp') {
        valA = a.timestamp;
        valB = b.timestamp;
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [logs, searchTerm, sortField, sortDirection]);

  // Working CSV Export handler
  const handleExportCSV = () => {
    const headers = [
      'Timestamp',
      'Device ID',
      'Solar Voltage (V)',
      'Solar Current (A)',
      'Solar Power (W)',
      'Load Current (A)',
      'Load Power (W)',
      'Temperature (°C)',
      'Humidity (%)',
      'Data Source',
    ];

    const rows = (displayLogs.length > 0 ? displayLogs : logs).map((row) => [
      `"${row.timestamp}"`,
      `"${row.deviceId}"`,
      row.voltage.toFixed(2),
      row.current.toFixed(2),
      row.power.toFixed(2),
      (row.loadCurrent ?? 0).toFixed(2),
      (row.loadPower ?? 0).toFixed(2),
      row.temperature.toFixed(1),
      Math.round(row.humidity),
      row.isSimulated ? '"Simulated"' : '"Real ESP32"',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `pv_intelligence_telemetry_${activeSource}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSort = (field: 'timestamp' | 'power' | 'voltage' | 'temperature') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historical Telemetry Data Logs"
        description="Comprehensive sensor records captured from the ESP32 node for 100 Wp solar generation, DC load, and environmental parameters."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="p-2 rounded-lg text-[#475569] border border-[#E2E8F0] shadow-2xs hover:bg-slate-100 hover:text-[#0F172A] hover:border-slate-300 active:bg-slate-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300 transition-all duration-150 cursor-pointer"
              title="Refresh logs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleExportCSV}
              disabled={displayLogs.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#16A34A] text-white hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500 shadow-xs transition-all duration-150 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        }
      />

      {/* Honest Empty State for Real Telemetry */}
      {activeSource === 'real' && totalRecords === 0 && !loading && (
        <div className="p-5 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3.5">
            <AlertCircle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-[#0F172A]">
                Waiting for ESP32 telemetry. No real readings have been received yet.
              </h4>
              <p className="text-xs text-[#475569] mt-0.5">
                The SQLite database contains 0 real hardware records. Telemetry will automatically log when your physical ESP32 posts to <code className="text-[#2563EB] font-mono">/api/telemetry</code>.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveSource('simulated');
              setSimulating(true);
            }}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-amber-300 text-[#D97706] hover:bg-amber-100/50 shadow-2xs transition-colors shrink-0 cursor-pointer"
          >
            Switch to Simulated Buffer
          </button>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search timestamp, voltage, power..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-emerald-400 transition-all duration-150"
          />
        </div>

        {/* Source Selector & Page Size */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Source Toggle */}
          <div className="flex items-center rounded-lg border border-[#E2E8F0] p-0.5 bg-slate-50">
            <button
              onClick={() => {
                setActiveSource('real');
                setPage(0);
              }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeSource === 'real'
                  ? 'bg-white text-[#2563EB] font-bold shadow-2xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              Real ESP32
            </button>
            <button
              onClick={() => {
                setActiveSource('simulated');
                setPage(0);
              }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeSource === 'simulated'
                  ? 'bg-white text-[#D97706] font-bold shadow-2xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              Simulated
            </button>
          </div>

          {/* Rows per page */}
          <div className="flex items-center gap-1.5 text-[#475569]">
            <Filter className="w-3.5 h-3.5 text-[#94A3B8]" />
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="bg-slate-50 border border-[#E2E8F0] text-[#0F172A] rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-emerald-400 transition-all duration-150 cursor-pointer"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Structured Telemetry Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#2563EB]" />
            <span className="font-bold text-[#0F172A]">
              Telemetry Logs ({totalRecords} Total Records)
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#475569]">
            <Database className="w-3.5 h-3.5 text-[#94A3B8]" />
            <span>Storage: SQLite (pv_intelligence.db)</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#0F172A]">
            <thead className="bg-slate-50 text-[#475569] uppercase text-[10px] tracking-wider border-b border-[#E2E8F0] select-none">
              <tr>
                <th
                  onClick={() => toggleSort('timestamp')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100/70"
                >
                  <div className="flex items-center gap-1">
                    <span>Timestamp</span>
                    <ArrowUpDown className="w-3 h-3 text-[#94A3B8]" />
                  </div>
                </th>
                <th className="py-3 px-3">Device ID</th>
                <th
                  onClick={() => toggleSort('voltage')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100/70"
                >
                  <div className="flex items-center gap-1">
                    <span>Solar Voltage</span>
                    <ArrowUpDown className="w-3 h-3 text-[#94A3B8]" />
                  </div>
                </th>
                <th className="py-3 px-3">Solar Current</th>
                <th
                  onClick={() => toggleSort('power')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100/70"
                >
                  <div className="flex items-center gap-1">
                    <span>Solar Power</span>
                    <ArrowUpDown className="w-3 h-3 text-[#94A3B8]" />
                  </div>
                </th>
                <th className="py-3 px-3">Load Current</th>
                <th className="py-3 px-3">Load Power</th>
                <th
                  onClick={() => toggleSort('temperature')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100/70"
                >
                  <div className="flex items-center gap-1">
                    <span>Temp (°C)</span>
                    <ArrowUpDown className="w-3 h-3 text-[#94A3B8]" />
                  </div>
                </th>
                <th className="py-3 px-3">Humidity</th>
                <th className="py-3 px-3">Data Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] font-mono text-[11px]">
              {displayLogs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-[#94A3B8] font-sans">
                    {loading ? 'Loading telemetry records...' : 'No telemetry records found.'}
                  </td>
                </tr>
              ) : (
                displayLogs.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-slate-50 transition-colors duration-100 cursor-default">
                    <td className="py-2.5 px-3 text-[#475569] whitespace-nowrap">{row.timestamp}</td>
                    <td className="py-2.5 px-3 text-[#0F172A] font-semibold">{row.deviceId}</td>
                    <td className="py-2.5 px-3 text-[#0F172A]">{row.voltage.toFixed(2)} V</td>
                    <td className="py-2.5 px-3 text-[#0F172A]">{row.current.toFixed(2)} A</td>
                    <td className="py-2.5 px-3 text-[#16A34A] font-bold">{row.power.toFixed(2)} W</td>
                    <td className="py-2.5 px-3 text-[#2563EB]">{(row.loadCurrent ?? 0).toFixed(2)} A</td>
                    <td className="py-2.5 px-3 text-[#2563EB]">{(row.loadPower ?? 0).toFixed(2)} W</td>
                    <td className="py-2.5 px-3 text-[#475569]">{row.temperature.toFixed(1)}°C</td>
                    <td className="py-2.5 px-3 text-[#475569]">{Math.round(row.humidity)}%</td>
                    <td className="py-2.5 px-3 font-sans">
                      {row.isSimulated ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-[#D97706] border border-amber-200">
                          <span className="w-1 h-1 rounded-full bg-[#D97706]" />
                          Simulated
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-[#16A34A] border border-emerald-200">
                          <span className="w-1 h-1 rounded-full bg-[#16A34A]" />
                          Real ESP32
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#475569]">
          <div>
            Showing {displayLogs.length > 0 ? page * pageSize + 1 : 0} to{' '}
            {Math.min((page + 1) * pageSize, totalRecords)} of {totalRecords} records
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-md border border-[#E2E8F0] text-[#475569] hover:bg-slate-100 hover:text-[#0F172A] active:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300 transition-all duration-150 cursor-pointer"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-md border border-[#E2E8F0] text-[#475569] hover:bg-slate-100 hover:text-[#0F172A] active:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300 transition-all duration-150 cursor-pointer"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
