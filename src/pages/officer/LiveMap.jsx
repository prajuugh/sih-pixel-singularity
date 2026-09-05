import { MapPin } from "lucide-react";
import Navbar from "../../components/common/Navbar";
import Sidebar from "../../components/common/Sidebar";

export default function LiveMap() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="flex items-center gap-2 mb-6">
            <MapPin className="text-green-800" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">Live Map</h2>
          </div>

          {/* TODO: wire up a real map (Leaflet / Google Maps) showing live block status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-[70vh] flex items-center justify-center text-gray-400">
            Live map coming soon
          </div>
        </main>
      </div>
    </div>
  );
}
