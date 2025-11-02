import React, { useState } from 'react';
import { Play, Plus, Trash2, RotateCcw } from 'lucide-react';

type Process = {
  id: number;
  name: string;
  arrivalTime: number;
  burstTime: number;
  priority: number;
};

type GanttSegment = {
  process: string;
  start: number;
  end: number;
  id: number;
};

type ProcessStats = {
  completionTime: number;
  turnaroundTime: number;
  waitingTime: number;
};

type Stats = {
  processStats: Record<string, ProcessStats>;
  avgTurnaround: number;
  avgWaiting: number;
};

type Algorithm = 'FCFS' | 'SJF' | 'SJF-PRE' | 'Priority' | 'Priority-PRE' | 'RR';

// --- Component ---
const CPUScheduler: React.FC = () => {
  const [processes, setProcesses] = useState<Process[]>([
    { id: 1, name: 'P1', arrivalTime: 0, burstTime: 5, priority: 2 },
    { id: 2, name: 'P2', arrivalTime: 1, burstTime: 3, priority: 1 },
    { id: 3, name: 'P3', arrivalTime: 2, burstTime: 8, priority: 3 },
    { id: 4, name: 'P4', arrivalTime: 3, burstTime: 6, priority: 2 }
  ]);

  const [algorithm, setAlgorithm] = useState<Algorithm>('FCFS');
  const [quantum, setQuantum] = useState<number>(2);
  const [ganttChart, setGanttChart] = useState<GanttSegment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [nextId, setNextId] = useState<number>(5);

  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
  ];

  const addProcess = () => {
    setProcesses(prev => ([...prev, {
      id: nextId,
      name: `P${nextId}`,
      arrivalTime: 0,
      burstTime: 5,
      priority: 1
    }]));
    setNextId(prev => prev + 1);
  };

  const deleteProcess = (id: number) => {
    setProcesses(prev => prev.filter(p => p.id !== id));
  };

  const updateProcess = (id: number, field: keyof Process, value: string) => {
    const parsed = parseInt(value);
    setProcesses(prev => prev.map(p =>
      p.id === id ? { ...p, [field]: Number.isNaN(parsed) ? (field === 'name' ? (value as unknown as string) : 0) : parsed } : p
    ));
  };

  const reset = () => {
    setProcesses([
      { id: 1, name: 'P1', arrivalTime: 0, burstTime: 5, priority: 2 },
      { id: 2, name: 'P2', arrivalTime: 1, burstTime: 3, priority: 1 },
      { id: 3, name: 'P3', arrivalTime: 2, burstTime: 8, priority: 3 },
      { id: 4, name: 'P4', arrivalTime: 3, burstTime: 6, priority: 2 }
    ]);
    setNextId(5);
    setGanttChart([]);
    setStats(null);
  };

  // --- Algorithms ---
  // FCFS (non-preemptive)
  const fcfs = (procs: Process[]): GanttSegment[] => {
    const sorted = [...procs].sort((a, b) => a.arrivalTime - b.arrivalTime);
    const chart: GanttSegment[] = [];
    let currentTime = 0;

    sorted.forEach(proc => {
      if (currentTime < proc.arrivalTime) currentTime = proc.arrivalTime;
      chart.push({ process: proc.name, start: currentTime, end: currentTime + proc.burstTime, id: proc.id });
      currentTime += proc.burstTime;
    });

    return chart;
  };

  // SJF non-preemptive (Shortest Job First)
  const sjfNonPreemptive = (procs: Process[]): GanttSegment[] => {
    const chart: GanttSegment[] = [];
    let currentTime = 0;
    const remaining = procs.map(p => ({ ...p, remaining: p.burstTime, started: false } as any));

    while (remaining.some((r: any) => r.remaining > 0)) {
      const available = remaining.filter((r: any) => r.arrivalTime <= currentTime && r.remaining > 0);
      if (available.length === 0) {
        currentTime++;
        continue;
      }
      const shortest = available.reduce((min: any, p: any) => p.remaining < min.remaining ? p : min);
      chart.push({ process: shortest.name, start: currentTime, end: currentTime + shortest.remaining, id: shortest.id });
      currentTime += shortest.remaining;
      shortest.remaining = 0;
    }

    return chart;
  };

  // SJF preemptive (Shortest Remaining Time First)
  const sjfPreemptive = (procs: Process[]): GanttSegment[] => {
    const chart: GanttSegment[] = [];
    const queue = procs.map(p => ({ ...p, remaining: p.burstTime }));
    let currentTime = 0;
    let finished = 0;
    let lastProcId: number | null = null;

    while (finished < queue.length) {
      const available = queue.filter(q => q.arrivalTime <= currentTime && q.remaining > 0);
      if (available.length === 0) {
        currentTime++;
        lastProcId = null;
        continue;
      }

      const shortest = available.reduce((min, p) => p.remaining < min.remaining ? p : min);

      if (lastProcId !== shortest.id) {
        // start a new segment
        chart.push({ process: shortest.name, start: currentTime, end: currentTime + 1, id: shortest.id });
      } else {
        // extend last segment
        const seg = chart[chart.length - 1];
        seg.end += 1;
      }

      shortest.remaining -= 1;
      if (shortest.remaining === 0) finished += 1;
      lastProcId = shortest.id;
      currentTime += 1;
    }

    return chart;
  };

  // Priority non-preemptive
  const priorityNonPreemptive = (procs: Process[]): GanttSegment[] => {
    const sorted = [...procs].sort((a, b) => a.arrivalTime - b.arrivalTime);
    const chart: GanttSegment[] = [];
    let currentTime = 0;
    const remaining = sorted.map(p => ({ ...p, done: false } as any));

    while (remaining.some((r: any) => !r.done)) {
      const available = remaining.filter((r: any) => r.arrivalTime <= currentTime && !r.done);
      if (available.length === 0) {
        currentTime++;
        continue;
      }
      const highest = available.reduce((min: any, p: any) => p.priority < min.priority ? p : min);
      chart.push({ process: highest.name, start: currentTime, end: currentTime + highest.burstTime, id: highest.id });
      currentTime += highest.burstTime;
      highest.done = true;
    }

    return chart;
  };

  // Priority preemptive (lower number = higher priority)
  const priorityPreemptive = (procs: Process[]): GanttSegment[] => {
    const chart: GanttSegment[] = [];
    const queue = procs.map(p => ({ ...p, remaining: p.burstTime }));
    let currentTime = 0;
    let finished = 0;
    let lastProcId: number | null = null;

    while (finished < queue.length) {
      const available = queue.filter(q => q.arrivalTime <= currentTime && q.remaining > 0);
      if (available.length === 0) {
        currentTime++;
        lastProcId = null;
        continue;
      }

      const highest = available.reduce((min, p) => p.priority < min.priority ? p : min);

      if (lastProcId !== highest.id) {
        chart.push({ process: highest.name, start: currentTime, end: currentTime + 1, id: highest.id });
      } else {
        const seg = chart[chart.length - 1];
        seg.end += 1;
      }

      highest.remaining -= 1;
      if (highest.remaining === 0) finished += 1;
      lastProcId = highest.id;
      currentTime += 1;
    }

    return chart;
  };

  // Round Robin
  const roundRobin = (procs: Process[], q: number): GanttSegment[] => {
    const chart: GanttSegment[] = [];
    const queue = procs
      .map(p => ({ ...p, remaining: p.burstTime }))
      .sort((a, b) => a.arrivalTime - b.arrivalTime);

    let currentTime = 0;
    const ready: any[] = [];
    let i = 0;

    while (queue.some((p: any) => p.remaining > 0) || ready.length > 0) {
      // push newly arrived
      queue.forEach(qp => {
        if (qp.arrivalTime <= currentTime && !ready.includes(qp) && qp.remaining > 0) ready.push(qp);
      });

      if (ready.length === 0) {
        currentTime++;
        continue;
      }

      const proc = ready.shift() as any;
      const exec = Math.min(q, proc.remaining);
      chart.push({ process: proc.name, start: currentTime, end: currentTime + exec, id: proc.id });
      currentTime += exec;
      proc.remaining -= exec;

      // re-add if remaining
      // push newly arrived while we were executing
      queue.forEach(qp => {
        if (qp.arrivalTime <= currentTime && !ready.includes(qp) && qp.remaining > 0 && qp !== proc) ready.push(qp);
      });

      if (proc.remaining > 0) ready.push(proc);
    }

    return chart;
  };

  // --- Stats calculation ---
  const calculateStats = (chart: GanttSegment[]): Stats => {
    const processStats: Record<string, ProcessStats> = {};

    processes.forEach(proc => {
      const segments = chart.filter(c => c.process === proc.name);
      if (segments.length === 0) {
        // process never scheduled (shouldn't happen normally)
        processStats[proc.name] = { completionTime: 0, turnaroundTime: 0, waitingTime: 0 };
        return;
      }

      const completionTime = Math.max(...segments.map(s => s.end));
      const turnaroundTime = completionTime - proc.arrivalTime;
      const waitingTime = turnaroundTime - proc.burstTime;

      processStats[proc.name] = { completionTime, turnaroundTime, waitingTime };
    });

    const avgTurnaround = Object.values(processStats).reduce((sum, s) => sum + s.turnaroundTime, 0) / processes.length;
    const avgWaiting = Object.values(processStats).reduce((sum, s) => sum + s.waitingTime, 0) / processes.length;

    return { processStats, avgTurnaround, avgWaiting };
  };

  // --- Simulate handler ---
  const simulate = () => {
    if (processes.length === 0) return;

    let chart: GanttSegment[] = [];

    switch (algorithm) {
      case 'FCFS':
        chart = fcfs(processes);
        break;
      case 'SJF':
        chart = sjfNonPreemptive(processes);
        break;
      case 'SJF-PRE':
        chart = sjfPreemptive(processes);
        break;
      case 'Priority':
        chart = priorityNonPreemptive(processes);
        break;
      case 'Priority-PRE':
        chart = priorityPreemptive(processes);
        break;
      case 'RR':
        chart = roundRobin(processes, quantum);
        break;
      default:
        chart = fcfs(processes);
    }

    setGanttChart(chart);
    setStats(calculateStats(chart));
  };

  const maxTime = ganttChart.length > 0 ? Math.max(...ganttChart.map(g => g.end)) : 20;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">CPU Scheduling Visualizer</h1>
          <p className="text-purple-200">Visualize different CPU scheduling algorithms with Gantt charts</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Processes</h2>
              <button onClick={addProcess} className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition">
                <Plus size={18} />
                Add Process
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-white">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-2 px-2">Process</th>
                    <th className="text-left py-2 px-2">Arrival</th>
                    <th className="text-left py-2 px-2">Burst</th>
                    <th className="text-left py-2 px-2">Priority</th>
                    <th className="text-left py-2 px-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {processes.map(proc => (
                    <tr key={proc.id} className="border-b border-white/10">
                      <td className="py-2 px-2 font-semibold">{proc.name}</td>
                      <td className="py-2 px-2">
                        <input type="number" value={proc.arrivalTime} onChange={(e) => updateProcess(proc.id, 'arrivalTime', e.target.value)} className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-white" min={0} />
                      </td>
                      <td className="py-2 px-2">
                        <input type="number" value={proc.burstTime} onChange={(e) => updateProcess(proc.id, 'burstTime', e.target.value)} className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-white" min={1} />
                      </td>
                      <td className="py-2 px-2">
                        <input type="number" value={proc.priority} onChange={(e) => updateProcess(proc.id, 'priority', e.target.value)} className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-white" min={1} />
                      </td>
                      <td className="py-2 px-2">
                        <button onClick={() => deleteProcess(proc.id)} className="p-2 text-red-400 hover:text-red-300 transition">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">Settings</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-purple-200 mb-2">Algorithm</label>
                <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value as Algorithm)} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white">
                  <option value="FCFS">First Come First Serve</option>
                  <option value="SJF">Shortest Job First (non-preemptive)</option>
                  <option value="SJF-PRE">SJF - Preemptive (SRTF)</option>
                  <option value="Priority">Priority (non-preemptive)</option>
                  <option value="Priority-PRE">Priority - Preemptive</option>
                  <option value="RR">Round Robin</option>
                </select>
              </div>

              {algorithm === 'RR' && (
                <div>
                  <label className="block text-purple-200 mb-2">Time Quantum: {quantum}</label>
                  <input type="range" min={1} max={10} value={quantum} onChange={(e) => setQuantum(parseInt(e.target.value))} className="w-full" />
                </div>
              )}

              <button onClick={simulate} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition">
                <Play size={20} />
                Simulate
              </button>

              <button onClick={reset} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition">
                <RotateCcw size={20} />
                Reset
              </button>
            </div>
          </div>
        </div>

        {ganttChart.length > 0 && (
          <>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mb-8">
              <h2 className="text-xl font-bold text-white mb-4">Gantt Chart</h2>

              <div className="overflow-x-auto">
                <div className="min-w-max">
                  <div className="flex border-b border-white/20 pb-2 mb-4">
                    {Array.from({ length: maxTime + 1 }).map((_, i) => (
                      <div key={i} className="text-purple-200 text-sm" style={{ width: '60px', textAlign: 'center' }}>{i}</div>
                    ))}
                  </div>

                  <div className="relative h-16 mb-4">
                    {ganttChart.map((segment, idx) => {
                      const colorIndex = (segment.id - 1) % colors.length;

                      return (
                        <div key={idx} className="absolute flex items-center justify-center text-white font-semibold rounded shadow-lg transition-transform hover:scale-105" style={{ left: `${segment.start * 60}px`, width: `${(segment.end - segment.start) * 60}px`, height: '64px', backgroundColor: colors[colorIndex], border: '2px solid rgba(255,255,255,0.3)' }}>
                          {segment.process}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {stats && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h2 className="text-xl font-bold text-white mb-4">Statistics</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-purple-200 mb-3">Process Details</h3>
                    <table className="w-full text-white">
                      <thead>
                        <tr className="border-b border-white/20">
                          <th className="text-left py-2">Process</th>
                          <th className="text-left py-2">TAT</th>
                          <th className="text-left py-2">WT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(stats.processStats).map(([name, s]) => (
                          <tr key={name} className="border-b border-white/10">
                            <td className="py-2 font-semibold">{name}</td>
                            <td className="py-2">{s.turnaroundTime}</td>
                            <td className="py-2">{s.waitingTime}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <h3 className="font-semibold text-purple-200 mb-3">Average Times</h3>
                    <div className="space-y-3">
                      <div className="bg-white/10 rounded-lg p-4">
                        <div className="text-purple-200 text-sm">Avg Turnaround Time</div>
                        <div className="text-2xl font-bold text-white">{stats.avgTurnaround.toFixed(2)}</div>
                      </div>
                      <div className="bg-white/10 rounded-lg p-4">
                        <div className="text-purple-200 text-sm">Avg Waiting Time</div>
                        <div className="text-2xl font-bold text-white">{stats.avgWaiting.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CPUScheduler;
