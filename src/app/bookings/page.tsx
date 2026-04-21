"use client";

import { useState, useMemo, useEffect  } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type MisBookingRow = {
  id?: string;
  bookingId?: string;
  bookingDate?: number;
  visitDate?: number;
  departmentId?: string | number;
  departmentName?: string;
  placeId?: string | number;
  placeName?: string;
  totalVisitors?: number;
  totalAmount?: number;
  bookingType?: string;
  transactionStatus?: string;
  bookingMode?: string;
  createdBy?: string;
  mobile?: string;
  device?: string;
  ipAddress?: string;
  [key: string]: unknown;
};

type MisApiResponse = {
  code?: number;
  message?: string;
  result?: unknown;
  data?: unknown;
  errors?: unknown;
  meta?: unknown;
};

type Department = {
  deptId?: string | number;
  deptName?: string;
  id?: string | number;
  name?: string;
  [key: string]: unknown;
};

type DeptApiResponse = {
  code?: number;
  message?: string;
  result?: unknown;
  data?: unknown;
  errors?: unknown;
  meta?: unknown;
};

function getDepartmentId(dept: Department) {
  const candidate =
    dept.deptId ??
    (dept as any).departmentId ??
    dept.id ??
    (dept as any).dept_id ??
    (dept as any).department_id ??
    (dept as any).deptCode ??
    (dept as any).departmentCode;
  if (typeof candidate === "string" || typeof candidate === "number") {
    return String(candidate);
  }

  const nameFallback = getDepartmentName(dept);
  if (nameFallback) {
    return nameFallback;
  }

  return "";
}

function getDepartmentName(dept: Department) {
  const candidate =
    dept.deptName ??
    (dept as any).departmentName ??
    dept.name ??
    (dept as any).dept_nm ??
    (dept as any).department_nm ??
    (dept as any).deptDesc ??
    (dept as any).departmentDesc;
  if (typeof candidate === "string") {
    return candidate.trim();
  }
  return "";
}

function findFirstArray(value: unknown, depth = 0): unknown[] | null {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value || typeof value !== "object" || depth >= 4) {
    return null;
  }

  const obj = value as Record<string, unknown>;

  const preferredKeys = ["result", "data", "content", "list", "rows", "items"];
  for (const key of preferredKeys) {
    if (key in obj) {
      const found = findFirstArray(obj[key], depth + 1);
      if (found) return found;
    }
  }

  for (const child of Object.values(obj)) {
    const found = findFirstArray(child, depth + 1);
    if (found) return found;
  }

  return null;
}

function extractDepartments(payload: unknown): Department[] {
  const list = findFirstArray(payload);
  if (!list) return [];

  return list.filter((item) => item && typeof item === "object") as Department[];
}

const DEFAULT_START_DAY = 1774981800000;

function getTodayEndMs() {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today.getTime();
}

function formatEpochMs(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-IN");
}

function toDateInputValue(value: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function extractMisRows(payload: unknown) {
  const list = findFirstArray(payload);
  if (!list) return [] as MisBookingRow[];
  return list.filter((item) => item && typeof item === "object") as MisBookingRow[];
}

function extractTotalRecords(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return 0;
  }

  const root = payload as MisApiResponse;
  const candidate =
    (root as any)?.result?.totalRecords ??
    (root as any)?.result?.total ??
    (root as any)?.totalRecords ??
    (root as any)?.total ??
    (root as any)?.result?.meta?.totalRecords ??
    (root as any)?.meta?.totalRecords;

  if (typeof candidate === "number" && Number.isFinite(candidate)) {
    return candidate;
  }

  return 0;
}

export default function BookingManagement() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
const [selectedBooking, setSelectedBooking] = useState<MisBookingRow | null>(null);
const [activeTab, setActiveTab] = useState<
  "INVENTORY" | "NON_INVENTORY" | "COMPOSITE"
>("INVENTORY");

  const todayMaxDate = useMemo(() => toDateInputValue(getTodayEndMs()), []);
  const [draftSearch, setDraftSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [departmentsError, setDepartmentsError] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [bookings, setBookings] = useState<MisBookingRow[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);

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

useEffect(() => {
  let isMounted = true;

  async function loadDepartments() {
    setDepartmentsLoading(true);
    setDepartmentsError(null);

    try {
      const response = await fetch(
        "/api/dept?offset=0&size=200&export=false&searchKey=",
        { headers: { Accept: "application/json" }, cache: "no-store" }
      );

      const payload = (await response.json()) as unknown;

      if (!response.ok) {
        const message =
          typeof (payload as any)?.message === "string"
            ? (payload as any).message
            : "Unable to load departments.";
        throw new Error(message);
      }

      const list = extractDepartments(payload)
        .filter((d) => Boolean(getDepartmentId(d)) && Boolean(getDepartmentName(d)));

      if (isMounted) {
        setDepartments(list);
      }
    } catch (error) {
      if (isMounted) {
        setDepartmentsError(
          error instanceof Error ? error.message : "Unable to load departments."
        );
      }
    } finally {
      if (isMounted) {
        setDepartmentsLoading(false);
      }
    }
  }

  loadDepartments();

  return () => {
    isMounted = false;
  };
}, []);

  const departmentOptions = useMemo(() => {
    return departments
      .map((dept) => ({
        id: getDepartmentId(dept),
        name: getDepartmentName(dept),
        raw: dept,
      }))
      .filter((opt) => Boolean(opt.id) && Boolean(opt.name))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [departments]);

  const [draftFilters, setDraftFilters] = useState({
    startDate: toDateInputValue(DEFAULT_START_DAY),
    endDate: todayMaxDate,
    dateType: "visit",
    bookingType: "",
    transactionStatus: "SUCCESS",
    departmentId: "",
  });

  const [appliedFilters, setAppliedFilters] = useState(() => ({
    startDate: toDateInputValue(DEFAULT_START_DAY),
    endDate: todayMaxDate,
    dateType: "visit",
    bookingType: "",
    transactionStatus: "SUCCESS",
    departmentId: "",
  }));

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadBookings() {
      setBookingsLoading(true);
      setBookingsError(null);

      try {
        const offset = (currentPage - 1) * itemsPerPage;
        const startDay = appliedFilters.startDate
          ? new Date(appliedFilters.startDate).setHours(0, 0, 0, 0)
          : DEFAULT_START_DAY;
        const endDay = appliedFilters.endDate
          ? new Date(appliedFilters.endDate).setHours(23, 59, 59, 999)
          : getTodayEndMs();
        const dateFilter = appliedFilters.dateType === "booking" ? "Booking" : "Visit";

        const params = new URLSearchParams();
        params.set("bookingType", appliedFilters.bookingType ?? "");
        params.set("divisionId", "");
        params.set("districtId", "");
        params.set("endDay", String(endDay));
        params.set("offSet", String(offset));
        params.set("placeId", "");
        params.set("size", String(itemsPerPage));
        params.set("startDay", String(startDay));
        params.set("ticketType", "");
        params.set("transactionStatus", (appliedFilters.transactionStatus ?? "SUCCESS").toString());
        params.set("departmentId", appliedFilters.departmentId ?? "");
        params.set("isFilter", "true");
        params.set("dateFilter", dateFilter);
        params.set("searchKey", appliedSearch ?? "");
        params.set("zoneId", "");
        params.set("shiftId", "");
        params.set("quotaId", "");
        params.set("inventoryId", "");
        params.set("entryVerify", "ALL");
        params.set("driverVerify", "ALL");
        params.set("printCount", "ALL");

        // Determine API endpoint based on active tab
        let apiEndpoint = "/api/inventory/reports/mis_V3";
        if (activeTab === "NON_INVENTORY") {
          apiEndpoint = "/api/non-inventory/reports/mis_V3";
          // Remove inventory-specific parameters for non-inventory API
          params.delete("zoneId");
          params.delete("shiftId");
          params.delete("quotaId");
          params.delete("inventoryId");
          params.delete("entryVerify");
          params.delete("driverVerify");
        } else if (activeTab === "COMPOSITE") {
          apiEndpoint = "/api/inventory/reports/mis_V3";
        }

        const response = await fetch(`${apiEndpoint}?${params.toString()}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });

        const payload = (await response.json()) as unknown;

        if (!response.ok) {
          const message =
            typeof (payload as any)?.message === "string"
              ? (payload as any).message
              : "Unable to load bookings.";
          throw new Error(message);
        }

        const list = extractMisRows(payload);
        const total = extractTotalRecords(payload) || list.length;

        if (isMounted) {
          setBookings(list);
          setTotalRecords(total);
        }
      } catch (error) {
        if (isMounted) {
          setBookings([]);
          setTotalRecords(0);
          setBookingsError(error instanceof Error ? error.message : "Unable to load bookings.");
        }
      } finally {
        if (isMounted) {
          setBookingsLoading(false);
        }
      }
    }

    loadBookings();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [
    activeTab,
    currentPage,
    itemsPerPage,
    appliedSearch,
    appliedFilters.startDate,
    appliedFilters.endDate,
    appliedFilters.dateType,
    appliedFilters.bookingType,
    appliedFilters.transactionStatus,
    appliedFilters.departmentId,
  ]);

  const visibleBookings = useMemo(() => {
    return bookings.filter((row) => {
      const bookingType = typeof row.bookingType === "string" ? row.bookingType.toUpperCase() : "";
      return bookingType === activeTab;
    });
  }, [bookings, activeTab]);

  const offset = (currentPage - 1) * itemsPerPage;
  const totalPages = Math.max(1, Math.ceil((totalRecords || 0) / itemsPerPage));

  // 🎨 STATUS COLORS
  const statusColor = (status: string) => {
    switch (status) {
      case "Success":
      case "SUCCESS":
        return "bg-green-100 text-green-700";
      case "Failed":
      case "FAILED":
        return "bg-red-100 text-red-700";
      case "Pending":
      case "PENDING":
        return "bg-yellow-100 text-yellow-700";
      case "Progress":
      case "PROGRESS":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100";
    }
  };

  // 📊 EXPORT EXCEL
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(bookings);
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
      body: bookings.map((b) => [
        b.bookingId ?? "",
        b.departmentName ?? "",
        b.placeName ?? "",
        formatEpochMs(b.bookingDate),
        formatEpochMs(b.visitDate),
        b.totalVisitors ?? "",
        `₹${b.totalAmount ?? ""}`,
        b.bookingType ?? "",
        b.transactionStatus ?? "",
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

const downloadTicket = (data: MisBookingRow) => {
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
    ["Booking ID", data.bookingId ?? ""],
    ["Booking Date", formatEpochMs(data.bookingDate)],
    ["Visit Date", formatEpochMs(data.visitDate)],
    ["Name", typeof data.createdBy === "string" ? data.createdBy : "Guest User"],
    ["Mobile", typeof data.mobile === "string" ? data.mobile : ""],
    ["SSO ID", "SSO123456"],
    ["Department", data.departmentName ?? ""],
    ["Place", data.placeName ?? ""],
    ["Persons", typeof data.totalVisitors === "number" ? String(data.totalVisitors) : ""],
    ["Amount", typeof data.totalAmount === "number" ? `₹${data.totalAmount}` : ""],
    ["Booking Type", data.bookingType ?? ""],
    ["Payment Status", data.transactionStatus ?? ""],
    ["Transaction ID", typeof (data as any).emitraTransactionId === "string" ? (data as any).emitraTransactionId : ""],
    ["Device", typeof data.device === "string" ? data.device : ""],
    ["IP Address", typeof data.ipAddress === "string" ? data.ipAddress : ""],
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

  doc.save(`ticket_${data.bookingId ?? "booking"}.pdf`);
};

const getPaginationRange = () => {
  const delta = 1; // pages around current
  const range: (number | string)[] = [];

  const left = Math.max(2, currentPage - delta);
  const right = Math.min(totalPages - 1, currentPage + delta);

  range.push(1);

  if (left > 2) {
    range.push("...");
  }

  for (let i = left; i <= right; i++) {
    range.push(i);
  }

  if (right < totalPages - 1) {
    range.push("...");
  }

  if (totalPages > 1) {
    range.push(totalPages);
  }

  return range;
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

      <div className="grid grid-cols-7 gap-4">

  {/* Start Date */}
  <div className="flex flex-col">
    <label className="filter-label">Start Day</label>
    <input
      type="date"
      className="input"
      value={draftFilters.startDate}
      max={todayMaxDate}
      onChange={(e) => {
        const nextStartDate = e.target.value;
        const nextEndDate =
          draftFilters.endDate && nextStartDate && draftFilters.endDate < nextStartDate
            ? nextStartDate
            : draftFilters.endDate;

        setDraftFilters({ ...draftFilters, startDate: nextStartDate, endDate: nextEndDate });
      }}
    />
  </div>

  {/* End Date */}
  <div className="flex flex-col">
    <label className="filter-label">End Day</label>
    <input
      type="date"
      className="input"
      value={draftFilters.endDate}
      min={draftFilters.startDate || undefined}
      max={todayMaxDate}
      onChange={(e) => {
        const requestedEndDate = e.target.value;
        const nextEndDate =
          draftFilters.startDate && requestedEndDate && requestedEndDate < draftFilters.startDate
            ? draftFilters.startDate
            : requestedEndDate;

        setDraftFilters({ ...draftFilters, endDate: nextEndDate });
      }}
    />
  </div>

  {/* Date Type */}
  <div className="flex flex-col">
    <label className="filter-label">Date Type</label>
    <select
      className="input"
      value={draftFilters.dateType}
      onChange={(e) => {
        setDraftFilters({ ...draftFilters, dateType: e.target.value });
      }}
    >
      <option value="visit">Visit Date</option>
      <option value="booking">Booking Date</option>
    </select>
  </div>

  {/* Booking Type */}
  <div className="flex flex-col">
    <label className="filter-label">Booking Type</label>
    <select
      className="input"
      value={draftFilters.bookingType}
      onChange={(e) => {
        setDraftFilters({
          ...draftFilters,
          bookingType: e.target.value,
        });
      }}
    >
      <option value="">Booking Type</option>
      <option value="ONLINE">ONLINE</option>
      <option value="OFFLINE">OFFLINE</option>
    </select>
  </div>

  {/* Payment Status */}
  <div className="flex flex-col">
    <label className="filter-label">Payment Status</label>
    <select
      className="input"
      value={draftFilters.transactionStatus}
      onChange={(e) => {
        setDraftFilters({
          ...draftFilters,
          transactionStatus: e.target.value,
        });
      }}
    >
      <option value="SUCCESS">SUCCESS</option>
      <option value="FAILED">FAILED</option>
      <option value="PENDING">PENDING</option>
    </select>
  </div>

  {/* Department */}
  <div className="flex flex-col">
    <label className="filter-label">Department</label>
    <select
      className="input"
      value={draftFilters.departmentId}
      disabled={departmentsLoading}
      onChange={(e) => {
        const departmentId = e.target.value;

        if (!departmentId) {
          setSelectedDepartment(null);
          setDraftFilters({
            ...draftFilters,
            departmentId: "",
          });
          return;
        }

        const selected = departmentOptions.find((d) => d.id === departmentId);
        setSelectedDepartment(selected?.raw ?? null);
        setDraftFilters({
          ...draftFilters,
          departmentId,
        });
      }}
    >
      <option value="">
        {departmentsLoading
          ? "Loading Departments..."
          : departmentsError
          ? "Departments unavailable"
          : "All Departments"}
      </option>
      {departmentOptions.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.name}
        </option>
      ))}
    </select>
  </div>

  {/* Submit Button */}
  <div className="flex items-end">
    <button
      className="btn-pdf w-full h-[42px]"
      disabled={bookingsLoading}
      onClick={() => {
        setAppliedFilters(draftFilters);
        setAppliedSearch(draftSearch);
        setCurrentPage(1);
      }}
    >
      Submit
    </button>
  </div>

</div>
      </div>

      {/* SEARCH */}
      <input
        type="text"
        placeholder="Search booking..."
        value={draftSearch}
        onChange={(e) => {
          setDraftSearch(e.target.value);
        }}
        className="w-full p-3 mb-4 rounded-lg border border-[#eadfd8]"
      />

<div className="flex justify-center gap-3 mb-4">
  <button
    onClick={() => {
      setActiveTab("INVENTORY");
      setCurrentPage(1);
    }}
    className={`tab-btn ${activeTab === "INVENTORY" && "tab-active"}`}
  >
    INVENTORY
  </button>

  <button
    onClick={() => {
      setActiveTab("NON_INVENTORY");
      setCurrentPage(1);
    }}
    className={`tab-btn ${activeTab === "NON_INVENTORY" && "tab-active"}`}
  >
    NON-INVENTORY
  </button>

  <button
    onClick={() => {
      setActiveTab("COMPOSITE");
      setCurrentPage(1);
    }}
    className={`tab-btn ${activeTab === "COMPOSITE" && "tab-active"}`}
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
              <th className="p-3">Booking Type</th>
              <th className="p-3">Payment Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {bookingsLoading ? (
              <tr className="border-t">
                <td className="p-3 text-center text-gray-500" colSpan={10}>
                  Loading...
                </td>
              </tr>
            ) : bookingsError ? (
              <tr className="border-t">
                <td className="p-3 text-center text-red-600" colSpan={10}>
                  {bookingsError}
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr className="border-t">
                <td className="p-3 text-center text-gray-500" colSpan={10}>
                  No bookings found.
                </td>
              </tr>
            ) : (
              visibleBookings.map((item, i) => (
                <tr key={item.id ?? item.bookingId ?? i} className="border-t">
                  <td className="p-3">{item.bookingId}</td>
                  <td className="p-3">{item.departmentName}</td>
                  <td className="p-3">{item.placeName}</td>
                  <td className="p-3">{formatEpochMs(item.bookingDate)}</td>
                  <td className="p-3">{formatEpochMs(item.visitDate)}</td>
                  <td className="p-3">{item.totalVisitors}</td>
                  <td className="p-3">₹{item.totalAmount}</td>

                  <td className="p-3">
                    <span className={`badge ${statusColor(item.bookingType ?? "")}`}>
                      {item.bookingType}
                    </span>
                  </td>

                  <td className="p-3">
                    <span className={`badge ${statusColor(item.transactionStatus ?? "")}`}>
                      {item.transactionStatus}
                    </span>
                  </td>

                  <td className="p-3 flex gap-2">
                    <button
                      onClick={() => setSelectedBooking(item)}
                      className="btn-view"
                    >
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION + PAGE SIZE */}
      <div className="flex justify-between items-center mt-4">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-600">
            Showing {totalRecords ? offset + 1 : 0} to{" "}
            {totalRecords ? Math.min(offset + visibleBookings.length, totalRecords) : 0} of{" "}
            {totalRecords}
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

          {getPaginationRange().map((page, i) =>
              page === "..." ? (
                <span key={i} className="px-2 text-gray-500">
                  ...
                </span>
              ) : (
                <button
                  key={i}
                  onClick={() => setCurrentPage(Number(page))}
                  className={`px-3 py-1 rounded ${
                    currentPage === page
                      ? "bg-[#8b1e1e] text-white"
                      : "bg-[#f3e7df]"
                  }`}
                >
                  {page}
                </button>
              )
            )}

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

        <Detail label="Booking ID" value={selectedBooking.bookingId} />
        <Detail label="Booking Date" value={formatEpochMs(selectedBooking.bookingDate)} />
        <Detail label="Visit Date" value={formatEpochMs(selectedBooking.visitDate)} />
        <Detail label="SSO ID" value="SSO123456" />
        <Detail label="Mobile Number" value={selectedBooking.mobile ?? ""} />
        <Detail label="Name" value={selectedBooking.createdBy ?? "Guest User"} />
        <Detail label="Payment Status" value={selectedBooking.transactionStatus ?? ""} />
        <Detail label="Emitra Txn ID" value={typeof (selectedBooking as any).emitraTransactionId === "string" ? (selectedBooking as any).emitraTransactionId : ""} />
        <Detail label="Place Name" value={selectedBooking.placeName ?? ""} />
        <Detail label="Department" value={selectedBooking.departmentName ?? ""} />
        <Detail label="Booking Type" value={selectedBooking.bookingType ?? ""} />
        <Detail label="Device Type" value={selectedBooking.device ?? ""} />
        <Detail label="IP Address" value={selectedBooking.ipAddress ?? ""} />

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
