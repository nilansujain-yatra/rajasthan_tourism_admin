"use client";

import { useState, useMemo, useEffect  } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Booking = {
  id: string;
  department: string;
  place: string;
  bookingDate: string;
  visitDate: string;
  persons: number;
  amount: number;
  bookingStatus: string;
  paymentStatus: string;
  type: "inventory" | "non-inventory" | "composite";

};

const bookingsData: Booking[] = Array.from({ length: 120 }).map((_, i) => ({
  id: (234500 + i).toString(),
  department: ["Archaeology", "Forest", "RPACS"][i % 3],
  place: ["Hawa Mahal", "Jantar Mantar", "Nahargarh"][i % 3],
  bookingDate: "2026-04-18",
  visitDate: "2026-04-20",
  persons: (i % 5) + 1,
  amount: 1000 + i * 50,
  bookingStatus: ["Pending", "Success", "Failed"][i % 3],
  paymentStatus: ["Progress", "Pending", "Success"][i % 3],
  type: ["inventory", "non-inventory", "composite"][i % 3] as any,
}));

export default function BookingManagement() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
const [activeTab, setActiveTab] = useState<
  "inventory" | "non-inventory" | "composite"
>("inventory");

useEffect(() => {
  if (selectedBooking) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "auto";
  }

  return () => {
    document.body.style.overflow = "auto";
  };
}, [selectedBooking]);

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    dateType: "visit",
    bookingStatus: "",
    paymentStatus: "",
    department: "",
  });

  // 🔍 FILTER + SEARCH
  const filtered = useMemo(() => {
    return bookingsData.filter((item) => {
      const matchesSearch =
        `${item.id} ${item.place} ${item.department}`
          .toLowerCase()
          .includes(search.toLowerCase());

      const dateField =
        filters.dateType === "visit"
          ? item.visitDate
          : item.bookingDate;

      const matchesDate =
        (!filters.startDate || dateField >= filters.startDate) &&
        (!filters.endDate || dateField <= filters.endDate);

      const matchesBooking =
        !filters.bookingStatus ||
        item.bookingStatus === filters.bookingStatus;

      const matchesPayment =
        !filters.paymentStatus ||
        item.paymentStatus === filters.paymentStatus;

      const matchesDept =
        !filters.department || item.department === filters.department;

        const matchesTab = item.type === activeTab;

      return (
        matchesSearch &&
        matchesDate &&
        matchesBooking &&
        matchesPayment &&
        matchesDept &&
        matchesTab
      );
    });
  }, [search, filters]);

  // 📄 PAGINATION
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const paginatedData = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 🎨 STATUS COLORS
  const statusColor = (status: string) => {
    switch (status) {
      case "Success":
        return "bg-green-100 text-green-700";
      case "Failed":
        return "bg-red-100 text-red-700";
      case "Pending":
        return "bg-yellow-100 text-yellow-700";
      case "Progress":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100";
    }
  };

  // 📊 EXPORT EXCEL
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bookings");
    XLSX.writeFile(wb, "bookings.xlsx");
  };

  // 📄 EXPORT PDF
  const exportPDF = () => {
    const doc = new jsPDF();

    autoTable(doc, {
      head: [
        [
          "ID",
          "Department",
          "Place",
          "Booking",
          "Visit",
          "Persons",
          "Amount",
          "Booking Status",
          "Payment Status",
        ],
      ],
      body: filtered.map((b) => [
        b.id,
        b.department,
        b.place,
        b.bookingDate,
        b.visitDate,
        b.persons,
        `₹${b.amount}`,
        b.bookingStatus,
        b.paymentStatus,
      ]),
    });

    doc.save("bookings.pdf");
  };

  const Detail = ({ label, value }: { label: string; value: any }) => (
  <div className="bg-[#f7f3ef] p-3 rounded-lg border border-[#eadfd8]">
    <p className="text-xs text-gray-500">{label}</p>
    <p className="font-medium text-[#5c1c1c]">{value}</p>
  </div>
);

const downloadTicket = (data: Booking) => {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(16);
  doc.setTextColor(139, 30, 30);
  doc.text("Booking Ticket", 14, 20);

  // Divider
  doc.setDrawColor(200);
  doc.line(14, 25, 196, 25);

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  const details = [
    ["Booking ID", data.id],
    ["Booking Date", data.bookingDate],
    ["Visit Date", data.visitDate],
    ["Name", "Guest User"],
    ["Mobile", "9876543210"],
    ["SSO ID", "SSO123456"],
    ["Department", data.department],
    ["Place", data.place],
    ["Persons", data.persons.toString()],
    ["Amount", `₹${data.amount}`],
    ["Booking Status", data.bookingStatus],
    ["Payment Status", data.paymentStatus],
    ["Transaction ID", "TXN987654"],
    ["Device", "Android"],
    ["IP Address", "192.168.1.1"],
  ];

  autoTable(doc, {
    startY: 30,
    theme: "grid",
    head: [["Field", "Details"]],
    body: details,
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [139, 30, 30],
      textColor: 255,
    },
  });

  doc.save(`ticket_${data.id}.pdf`);
};

  return (
    <div className="p-6 bg-[#f7f3ef] min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold text-[#5c1c1c]">
          Booking Management
        </h1>

        <div className="flex gap-2">
          <button onClick={exportExcel} className="btn-excel">
            Export Excel
          </button>
          <button onClick={exportPDF} className="btn-pdf">
            Export PDF
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white rounded-xl p-4 border border-[#eadfd8] mb-4">
        <p className="text-[#5c1c1c] font-medium mb-3">Active Filters</p>

        <div className="grid grid-cols-6 gap-4">
          <input
            type="date"
            className="input"
            onChange={(e) => {
              setFilters({ ...filters, startDate: e.target.value });
              setCurrentPage(1);
            }}
          />

          <input
            type="date"
            className="input"
            onChange={(e) => {
              setFilters({ ...filters, endDate: e.target.value });
              setCurrentPage(1);
            }}
          />

          <select
            className="input"
            onChange={(e) => {
              setFilters({ ...filters, dateType: e.target.value });
              setCurrentPage(1);
            }}
          >
            <option value="visit">Visit Date</option>
            <option value="booking">Booking Date</option>
          </select>

          <select
            className="input"
            onChange={(e) => {
              setFilters({
                ...filters,
                bookingStatus: e.target.value,
              });
              setCurrentPage(1);
            }}
          >
            <option value="">Booking Status</option>
            <option>Pending</option>
            <option>Failed</option>
            <option>Success</option>
          </select>

          <select
            className="input"
            onChange={(e) => {
              setFilters({
                ...filters,
                paymentStatus: e.target.value,
              });
              setCurrentPage(1);
            }}
          >
            <option value="">Payment Status</option>
            <option>Progress</option>
            <option>Pending</option>
            <option>Failed</option>
            <option>Success</option>
          </select>

          <select
            className="input"
            onChange={(e) => {
              setFilters({
                ...filters,
                department: e.target.value,
              });
              setCurrentPage(1);
            }}
          >
            <option value="">All Departments</option>
            <option>Archaeology</option>
            <option>Forest</option>
            <option>RPACS</option>
          </select>
        </div>
      </div>

      {/* SEARCH */}
      <input
        type="text"
        placeholder="Search booking..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setCurrentPage(1);
        }}
        className="w-full p-3 mb-4 rounded-lg border border-[#eadfd8]"
      />

<div className="flex justify-center gap-3 mb-4">
  <button
    onClick={() => {
      setActiveTab("inventory");
      setCurrentPage(1);
    }}
    className={`tab-btn ${activeTab === "inventory" && "tab-active"}`}
  >
    INVENTORY
  </button>

  <button
    onClick={() => {
      setActiveTab("non-inventory");
      setCurrentPage(1);
    }}
    className={`tab-btn ${activeTab === "non-inventory" && "tab-active"}`}
  >
    NON-INVENTORY
  </button>

  <button
    onClick={() => {
      setActiveTab("composite");
      setCurrentPage(1);
    }}
    className={`tab-btn ${activeTab === "composite" && "tab-active"}`}
  >
    COMPOSITE
  </button>

</div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border border-[#eadfd8] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#f3e7df] text-[#5c1c1c]">
            <tr>
              <th className="p-3">Booking ID</th>
              <th className="p-3">Department</th>
              <th className="p-3">Place</th>
              <th className="p-3">Booking Date</th>
              <th className="p-3">Visit Date</th>
              <th className="p-3">Persons</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Booking Status</th>
              <th className="p-3">Payment Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginatedData.map((item, i) => (
              <tr key={i} className="border-t">
                <td className="p-3">{item.id}</td>
                <td className="p-3">{item.department}</td>
                <td className="p-3">{item.place}</td>
                <td className="p-3">{item.bookingDate}</td>
                <td className="p-3">{item.visitDate}</td>
                <td className="p-3">{item.persons}</td>
                <td className="p-3">₹{item.amount}</td>

                <td className="p-3">
                  <span className={`badge ${statusColor(item.bookingStatus)}`}>
                    {item.bookingStatus}
                  </span>
                </td>

                <td className="p-3">
                  <span className={`badge ${statusColor(item.paymentStatus)}`}>
                    {item.paymentStatus}
                  </span>
                </td>

                <td className="p-3 flex gap-2">
                  <button 
                    onClick={() => setSelectedBooking(item)}
                  className="btn-view">
                    View Details
                    </button>
                <button
                  onClick={() => downloadTicket(item)}
                  className="btn-download"
                >
                  Download Ticket
                </button>       
                         </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION + PAGE SIZE */}
      <div className="flex justify-between items-center mt-4">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-600">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, filtered.length)} of{" "}
            {filtered.length}
          </p>

          <div className="flex items-center gap-2">
            <span className="text-sm text-[#5c1c1c]">Rows:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border rounded bg-white"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="btn-light"
          >
            Prev
          </button>

          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 rounded ${
                currentPage === i + 1
                  ? "bg-[#8b1e1e] text-white"
                  : "bg-[#f3e7df]"
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="btn-light"
          >
            Next
          </button>



          {selectedBooking && (
<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-hidden">

<div className="bg-white rounded-2xl w-[700px] max-h-[80vh] overflow-y-auto p-6 shadow-xl border">      
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-[#5c1c1c]">
          Booking Details
        </h2>

        <button
          onClick={() => setSelectedBooking(null)}
          className="text-gray-500 hover:text-black"
        >
          ✕
        </button>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-2 gap-4 text-sm">

        <Detail label="Booking ID" value={selectedBooking.id} />
        <Detail label="Booking Date" value={selectedBooking.bookingDate} />
        <Detail label="Visit Date" value={selectedBooking.visitDate} />
        <Detail label="SSO ID" value="SSO123456" />
        <Detail label="Mobile Number" value="9876543210" />
        <Detail label="Name" value="Guest User" />
        <Detail label="Payment Status" value={selectedBooking.paymentStatus} />
        <Detail label="Emitra Txn ID" value="TXN987654" />
        <Detail label="Place Name" value={selectedBooking.place} />
        <Detail label="Department" value={selectedBooking.department} />
        <Detail label="Booking Status" value={selectedBooking.bookingStatus} />
        <Detail label="Device Type" value="Android" />
        <Detail label="IP Address" value="192.168.1.1" />

      </div>

      {/* Footer */}
      <div className="flex justify-end mt-6">
        <button
          onClick={() => setSelectedBooking(null)}
          className="btn-primary"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}
        </div>
      </div>
    </div>
  );


  
}
