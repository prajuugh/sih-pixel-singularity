import { useEffect, useState } from "react";
import { Fragment } from "react";
import { Search, ChevronDown, ChevronUp, Sparkles, Clock, Ban, CheckCircle2 } from "lucide-react";
import Navbar from "../../components/common/Navbar";
import Sidebar from "../../components/common/Sidebar";
import Button from "../../components/common/Button";
import { fetchRequests } from "../../utils/api";
import { requestStatusStyles } from "../../utils/constants";

export default function CheckStatus() {
  const [query, setQuery] = useState("");
  const [requests, setRequests] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchRequests().then((data) => {
      setRequests(data);
      setExpandedId(data[0]?.id ?? null);
    });
  }, []);

  const filtered = requests.filter((r) =>
    r.id.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="flex items-center gap-2 mb-1">
            <Search className="text-green-800" size={22} />
            <h2 className="text-2xl font-bold text-gray-900">Check Request Status</h2>
          </div>
          <p className="text-gray-500 mb-6">Track your submitted maintenance requests.</p>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
            <label className="block text-sm font-semibold text-green-800 mb-2">
              Search Request ID
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter Request ID (e.g. SMMS-2026-00782)"
                className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5"
              />
              <Button icon={Search}>Search</Button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Requests</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                Show
                <select className="border border-gray-200 rounded px-2 py-1">
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                </select>
                entries
              </div>
            </div>

            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100">
                  <th className="py-2 px-2 w-8" />
                  <th className="py-2 px-2 font-semibold">Request ID</th>
                  <th className="py-2 px-2 font-semibold">Maintenance Type</th>
                  <th className="py-2 px-2 font-semibold">Date</th>
                  <th className="py-2 px-2 font-semibold">Status</th>
                  <th className="py-2 px-2 font-semibold">Reason</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Search size={32} className="text-gray-300" />
                        <p className="font-semibold text-gray-700">No Maintenance Requests Found</p>
                        <p className="text-xs text-gray-400">
                          {query
                            ? `No requests match "${query}". Try another ID or clear the search.`
                            : "No maintenance requests have been submitted yet. Submit a new request from the Team Requests portal."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const isOpen = expandedId === r.id;
                    return (
                      <Fragment key={r.id}>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 px-2">
                          <button
                            onClick={() => setExpandedId(isOpen ? null : r.id)}
                            className="text-gray-400"
                          >
                            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                        <td className="py-3 px-2 text-gray-700">{r.id}</td>
                        <td className="py-3 px-2 text-gray-700">{r.type}</td>
                        <td className="py-3 px-2 text-gray-700">{r.date}</td>
                        <td className="py-3 px-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${requestStatusStyles[r.status]}`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <button
                            onClick={() => setExpandedId(isOpen ? null : r.id)}
                            className="border border-green-700 text-green-800 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1"
                          >
                            View Reason
                            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-green-50">
                          <td />
                          <td colSpan={5} className="py-4 px-4">
                            <p className="font-semibold text-green-800 mb-1">
                              Reason for Current Status
                            </p>
                            <p className="text-gray-600 mb-3">{r.reason}</p>
                            <div className="flex gap-16">
                              <div>
                                <p className="text-xs font-semibold text-gray-500">
                                  Current Stage
                                </p>
                                <p className="text-gray-700">{r.stage}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-500">
                                  Last Updated
                                </p>
                                <p className="text-gray-700">{r.updated}</p>
                              </div>
                            </div>

                            {/* Prominent Revised Block Plan Display in Tracker */}
                            {(r.recommendedBlock || r.prohibitedWindow || r.status === "Revised Plan") && (
                              <div className="mt-4 bg-white border border-green-300 rounded-xl p-4 shadow-2xs space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 font-bold text-green-950 text-xs">
                                    <Sparkles size={14} className="text-amber-500" />
                                    <span>AI Revised Block Plan:</span>
                                  </div>
                                  <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full border border-green-200">
                                    Zero Train Conflict Slot
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                                  <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                                    <span className="text-[10px] text-gray-400 font-semibold block uppercase">Original Window</span>
                                    <span className="font-mono text-gray-500 line-through font-semibold text-xs">
                                      {r.raw?.preferred_start_time || "19:00"} - {r.raw?.preferred_end_time || "21:00"}
                                    </span>
                                  </div>
                                  {r.prohibitedWindow && (
                                    <div className="bg-rose-50 p-2 rounded-lg border border-rose-200">
                                      <span className="text-[10px] text-rose-600 font-bold block uppercase flex items-center gap-1">
                                        <Ban size={10} /> Officer Blackout
                                      </span>
                                      <span className="font-mono text-rose-900 font-bold text-xs">
                                        {r.prohibitedWindow.startTime} - {r.prohibitedWindow.endTime}
                                      </span>
                                    </div>
                                  )}
                                  <div className="bg-green-100 p-2 rounded-lg border border-green-300">
                                    <span className="text-[10px] text-green-800 font-bold block uppercase flex items-center gap-1">
                                      <Clock size={10} className="text-green-700" /> Revised Block Window
                                    </span>
                                    <span className="font-mono text-green-950 font-black text-sm">
                                      {r.recommendedBlock?.startTime || "22:15"} - {r.recommendedBlock?.endTime || "23:45"}
                                    </span>
                                  </div>
                                </div>

                                {r.aiExplanation && (
                                  <div className="text-[11px] text-green-900 bg-green-50/70 p-2.5 rounded-lg border border-green-200 flex items-start gap-2">
                                    <CheckCircle2 size={14} className="text-green-600 shrink-0 mt-0.5" />
                                    <span>{r.aiExplanation}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
              </tbody>
            </table>

            <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
              <p>
                Showing 1 to {filtered.length} of {requests.length} entries
              </p>
              <div className="flex items-center gap-1">
                <button className="px-2 py-1 rounded hover:bg-gray-50">Previous</button>
                <button className="w-7 h-7 rounded bg-green-800 text-white">1</button>
                <button className="px-2 py-1 rounded hover:bg-gray-50">Next</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
