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
        <main className="min-w-0 flex-1 p-4 pb-20 md:p-6 md:pb-6 xl:p-8">
          <div className="flex items-center gap-2 mb-1">
            <Search className="text-[#b83825]" size={22} />
            <h2 className="text-2xl font-bold text-gray-900">Check Request Status</h2>
          </div>
          <p className="text-gray-500 mb-6">Track your submitted maintenance requests.</p>

          <div className="mb-6 rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_rgb(0_0_0/0.04)] ring-1 ring-black/[0.05]">
            <label htmlFor="request-search" className="block text-sm font-semibold text-[#b83825] mb-2">
              Search Request ID
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                id="request-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter Request ID (e.g. SMMS-2026-00782)"
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 transition-[border-color,box-shadow] duration-150 focus:border-[#cf432c] focus:outline-none focus:ring-2 focus:ring-[#cf432c]/15"
              />
              <Button icon={Search}>Search</Button>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_rgb(0_0_0/0.04)] ring-1 ring-black/[0.05]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Requests</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                Show
                <select aria-label="Rows per page" className="border border-gray-200 rounded px-2 py-1">
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
                {filtered.map((r) => {
                  const isOpen = expandedId === r.id;
                  return (
                    <Fragment key={r.id}>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 px-2">
                          <button
                            onClick={() => setExpandedId(isOpen ? null : r.id)}
                            aria-label={`${isOpen ? "Collapse" : "Expand"} request ${r.id}`}
                            className="inline-flex size-11 items-center justify-center rounded-lg text-gray-400 transition-[color,background-color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-gray-100 hover:text-gray-700 active:scale-[0.96]"
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
                            className="flex items-center gap-1 rounded-lg border border-[#cf432c] px-3 py-1.5 text-xs font-semibold text-[#b83825] transition-[color,background-color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-[#fff5f2] active:scale-[0.96]"
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
                            <p className="font-semibold text-[#b83825] mb-1">
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
                                  <span className="text-[10px] font-bold bg-green-100 text-[#b83825] px-2 py-0.5 rounded-full border border-green-200">
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
                                    <span className="text-[10px] text-[#b83825] font-bold block uppercase flex items-center gap-1">
                                      <Clock size={10} className="text-green-700" /> Revised Block Window
                                    </span>
                                    <span className="font-mono text-green-950 font-black text-sm">
                                      {r.recommendedBlock?.startTime || "22:15"} - {r.recommendedBlock?.endTime || "23:45"}
                                    </span>
                                  </div>
                                </div>

                                {r.aiExplanation && (
                                  <div className="text-[11px] text-[#8f2c1f] bg-green-50/70 p-2.5 rounded-lg border border-green-200 flex items-start gap-2">
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
                })}
              </tbody>
            </table>

            <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
              <p>
                Showing 1 to {filtered.length} of {requests.length} entries
              </p>
              <div className="flex items-center gap-1">
                <button className="rounded-lg px-3 py-2 transition-[background-color,transform] duration-150 hover:bg-gray-100 active:scale-[0.96]">Previous</button>
                <button className="size-8 rounded-lg bg-[#171918] text-white transition-transform duration-150 active:scale-[0.96]">1</button>
                <button className="rounded-lg px-3 py-2 transition-[background-color,transform] duration-150 hover:bg-gray-100 active:scale-[0.96]">Next</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
