"use client";

import { useState, useMemo, useEffect  } from "react";
// import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  MapPin,
  SlidersHorizontal,
  Ticket,
  X,
} from "lucide-react";

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

type Place = {
  placeId?: string | number;
  placeName?: string;
  id?: string | number;
  name?: string;
  [key: string]: unknown;
};

type PlaceApiResponse = {
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

function getPlaceId(place: Place) {
  const candidate =
    place.id ??
    (place as any).id ??
    place.placeId ??
    (place as any).place_id ??
    (place as any).placeCode ??
    (place as any).placecode ??
    undefined;

  if (typeof candidate === "string" || typeof candidate === "number") {
    return String(candidate);
  }

  const nameFallback = getPlaceName(place);
  if (nameFallback) {
    return nameFallback;
  }

  return "";
}

function getPlaceName(place: Place) {
  const candidate =
    place.placeName ??
    (place as any).placename ??
    (place as any).place_name ??
    place.name ??
    (place as any).name;

  if (typeof candidate === "string") {
    return candidate.trim();
  }
  return "";
}

function extractPlaces(payload: unknown): Place[] {
  const list = findFirstArray(payload);
  if (!list) return [];
  return list.filter((item) => item && typeof item === "object") as Place[];
}

const DEFAULT_START_DAY = 1774981800000;

function getTodayEndMs() {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today.getTime();
}

function getTodayStartMs() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openRowActions, setOpenRowActions] = useState<string | null>(null);

  const todayMaxDate = useMemo(() => toDateInputValue(getTodayEndMs()), []);
  const [draftSearch, setDraftSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [departmentsError, setDepartmentsError] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<MisBookingRow[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [hasAppliedFilters, setHasAppliedFilters] = useState(false);

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

  useEffect(() => {
    let isMounted = true;

    async function loadPlaces() {
      setPlacesLoading(true);
      setPlacesError(null);

      try {
        const response = await fetch(
          "/api/place?districtId=&searchKey=&deptList=&size=2000",
          { headers: { Accept: "application/json" }, cache: "no-store" }
        );

        const payload = (await response.json()) as unknown;

        if (!response.ok) {
          const message =
            typeof (payload as any)?.message === "string"
              ? (payload as any).message
              : "Unable to load places.";
          throw new Error(message);
        }

        const list = extractPlaces(payload)
          .filter((p) => Boolean(getPlaceId(p)) && Boolean(getPlaceName(p)));

        if (isMounted) {
          setPlaces(list);
        }
      } catch (error) {
        if (isMounted) {
          setPlacesError(
            error instanceof Error ? error.message : "Unable to load places."
          );
        }
      } finally {
        if (isMounted) {
          setPlacesLoading(false);
        }
      }
    }

    loadPlaces();

    return () => {
      isMounted = false;
    };
  }, []);

  const placeOptions = useMemo(() => {
    return places
      .map((place) => ({
        id: getPlaceId(place),
        name: getPlaceName(place),
        raw: place,
      }))
      .filter((opt) => Boolean(opt.id) && Boolean(opt.name))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [places]);

  const [draftFilters, setDraftFilters] = useState({
    startDate: "",
    endDate: "",
    dateType: "visit",
    bookingType: "",
    transactionStatus: "ALL",
    departmentId: "",
    placeId: "",
  });

  const [appliedFilters, setAppliedFilters] = useState(() => ({
    startDate: "",
    endDate: "",
    dateType: "visit",
    bookingType: "",
    transactionStatus: "ALL",
    departmentId: "",
    placeId: "",
  }));

  const openFilters = () => {
    setDraftFilters(appliedFilters);
    setFiltersOpen(true);
  };

  const closeFilters = () => {
    setFiltersOpen(false);
  };

  useEffect(() => {
    if (!hasAppliedFilters) {
      setBookings([]);
      setBookingsError(null);
      setTotalRecords(0);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    async function loadBookings() {
      setBookingsLoading(true);
      setBookingsError(null);

      try {
        const offset = currentPage;
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
        params.set("placeId", appliedFilters.placeId ?? "");
        params.set("size", String(itemsPerPage));
        params.set("startDay", String(startDay));
        // When transactionStatus is "ALL", send empty string to fetch all statuses
        params.set("transactionStatus", appliedFilters.transactionStatus === "ALL" ? "" : (appliedFilters.transactionStatus ?? ""));
        params.set("departmentId", appliedFilters.departmentId ?? "");
        params.set("isFilter", "true");
        params.set("dateFilter", dateFilter);
        params.set("searchKey", appliedSearch ?? "");
        params.set("printCount", "ALL");

        // Determine API endpoint and parameters based on active tab
        let apiEndpoint = "/api/inventory/reports/mis_V3";

        if (activeTab === "INVENTORY") {
          params.set("ticketType", "");
          params.set("zoneId", "");
          params.set("shiftId", "");
          params.set("quotaId", "");
          params.set("inventoryId", "");
          params.set("entryVerify", "ALL");
          params.set("driverVerify", "ALL");
        } else if (activeTab === "NON_INVENTORY") {
          apiEndpoint = "/api/non-inventory/reports/mis_V3";
          params.set("ticketType", "");
          // Non-inventory API doesn't use these inventory-specific parameters
        } else if (activeTab === "COMPOSITE") {
          apiEndpoint = "/api/non-inventory/reports/mis_V3";
          params.set("ticketType", "COMPOSITE");
          // Non-inventory API doesn't use these inventory-specific parameters
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
    hasAppliedFilters,
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
    appliedFilters.placeId,
  ]);

  const visibleBookings = useMemo(() => {
    // Don't filter by bookingType as each tab calls its own API endpoint
    // that already returns the correct data
    return bookings;
  }, [bookings]);

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
  // const exportExcel = () => {
  //   const ws = XLSX.utils.json_to_sheet(bookings);
  //   const wb = XLSX.utils.book_new();
  //   XLSX.utils.book_append_sheet(wb, ws, "Bookings");
  //   XLSX.writeFile(wb, "bookings.xlsx");
  // };

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

const fmtText = (value: unknown) => {
  if (value === null || value === undefined) return "N/A";
  if (typeof value === "string") return value.trim() || "N/A";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "N/A";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return "N/A";
};

const getAny = (obj: unknown, key: string) => {
  if (!obj || typeof obj !== "object") return undefined;
  return (obj as any)[key];
};

const detailValue = (booking: MisBookingRow, keys: string[], format?: (v: unknown) => string) => {
  for (const key of keys) {
    const v = getAny(booking, key);
    if (v !== undefined && v !== null && (typeof v !== "string" || v.trim() !== "")) {
      return format ? format(v) : fmtText(v);
    }
  }
  return "N/A";
};

const formatEpochMaybe = (value: unknown) => {
  if (typeof value === "number") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return `${d.toLocaleDateString("en-IN")} | ${d.toLocaleTimeString("en-IN")}`;
    }
  }
  return fmtText(value);
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
          <button onClick={openFilters} className="btn-filter">
            Filter
          </button>
          {/* <button onClick={exportExcel} className="btn-excel">
            Export Excel
          </button> */}
          <button onClick={exportPDF} className="btn-pdf">
            Export PDF
          </button>
        </div>
      </div>

      {filtersOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: "rgba(28,16,8,0.45)", zIndex: 1000, backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeFilters(); }}
        >
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "#fff",
              width: 760,
              maxWidth: "95vw",
              maxHeight: "92vh",
              boxShadow: "0 24px 64px rgba(139,26,26,0.22)",
              animation: "fadeIn 0.2s ease-out",
            }}
          >
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ background: "linear-gradient(135deg, #6B1212, #A83030)" }}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center rounded-xl" style={{ width: 36, height: 36, background: "rgba(255,255,255,0.15)" }}>
                  <SlidersHorizontal size={18} color="#fff" />
                </div>
                <div>
                  <div className="font-serif font-bold text-white" style={{ fontSize: 17 }}>Booking Filters</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>Booking Management</div>
                </div>
              </div>
              <button
                onClick={closeFilters}
                aria-label="Close filters"
                className="flex items-center justify-center rounded-xl transition-colors"
                style={{ width: 32, height: 32, background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", cursor: "pointer" }}
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex items-center gap-2 px-6 py-2.5 flex-wrap" style={{ background: "var(--gold-pale)", borderBottom: "1px solid var(--sand)" }}>
              <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Active:</span>
              {[
                { label: draftFilters.dateType === "booking" ? "Booking Date" : "Visit Date" },
                draftFilters.startDate && { label: `From ${draftFilters.startDate}` },
                draftFilters.endDate && { label: `To ${draftFilters.endDate}` },
                draftFilters.bookingType && { label: draftFilters.bookingType },
                draftFilters.transactionStatus && { label: draftFilters.transactionStatus === "ALL" ? "All Payments" : draftFilters.transactionStatus },
                draftFilters.departmentId && { label: departmentOptions.find((d) => d.id === draftFilters.departmentId)?.name ?? "Department" },
                draftFilters.placeId && { label: placeOptions.find((p) => p.id === draftFilters.placeId)?.name ?? "Place" },
              ].filter(Boolean).map((item: any, i) => (
                <span
                  key={i}
                  className="rounded-full px-2.5 py-0.5 font-medium"
                  style={{ fontSize: 10, background: "rgba(139,26,26,0.1)", color: "var(--maroon)" }}
                >
                  {item.label.length > 28 ? `${item.label.slice(0, 28)}...` : item.label}
                </span>
              ))}
            </div>

            <div className="px-6 py-5 grid gap-4 overflow-y-auto" style={{ gridTemplateColumns: "1fr 1fr", maxHeight: "calc(92vh - 150px)" }}>
              <div className="col-span-2">
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <Calendar size={12} style={{ color: "var(--maroon)" }} />
                  Date Type
                </div>
                <div className="flex gap-2">
                  {[
                    { v: "visit", l: "Visit Date" },
                    { v: "booking", l: "Booking Date" },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      onClick={() => setDraftFilters({ ...draftFilters, dateType: opt.v })}
                      className="flex-1 py-2.5 rounded-xl font-medium transition-all"
                      style={{
                        fontSize: 13,
                        background: draftFilters.dateType === opt.v ? "var(--maroon)" : "var(--cream)",
                        color: draftFilters.dateType === opt.v ? "#fff" : "var(--text-mid)",
                        border: `1px solid ${draftFilters.dateType === opt.v ? "var(--maroon)" : "var(--sand)"}`,
                        cursor: "pointer",
                      }}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
                  <Calendar size={12} style={{ color: "var(--maroon)" }} />
                  Start Date
                </label>
                <input
                  type="date"
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
                  className="rounded-xl px-3 py-2.5 outline-none w-full"
                  style={{ fontSize: 13, background: "var(--cream)", border: "1px solid var(--sand)", color: "var(--text-dark)" }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
                  <Calendar size={12} style={{ color: "var(--maroon)" }} />
                  End Date
                </label>
                <input
                  type="date"
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
                  className="rounded-xl px-3 py-2.5 outline-none w-full"
                  style={{ fontSize: 13, background: "var(--cream)", border: "1px solid var(--sand)", color: "var(--text-dark)" }}
                />
              </div>

              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <Ticket size={12} style={{ color: "var(--maroon)" }} />
                  Booking Type
                </div>
                <div className="flex gap-2">
                  {[
                    { v: "", l: "All" },
                    { v: "ONLINE", l: "Online" },
                    { v: "OFFLINE", l: "Offline" },
                  ].map((opt) => (
                    <button
                      key={opt.v || "all"}
                      onClick={() => setDraftFilters({ ...draftFilters, bookingType: opt.v })}
                      className="flex-1 py-2.5 rounded-xl font-medium transition-all"
                      style={{
                        fontSize: 12,
                        background: draftFilters.bookingType === opt.v ? "var(--maroon)" : "var(--cream)",
                        color: draftFilters.bookingType === opt.v ? "#fff" : "var(--text-mid)",
                        border: `1px solid ${draftFilters.bookingType === opt.v ? "var(--maroon)" : "var(--sand)"}`,
                        cursor: "pointer",
                      }}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 size={12} style={{ color: "var(--maroon)" }} />
                  Payment Status
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { v: "ALL", l: "All", color: "var(--text-mid)" },
                    { v: "SUCCESS", l: "Success", color: "#1A7A6E" },
                    { v: "FAILED", l: "Failed", color: "#E53E3E" },
                    { v: "PENDING", l: "Pending", color: "#C8922A" },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      onClick={() => setDraftFilters({ ...draftFilters, transactionStatus: opt.v })}
                      className="flex-1 py-2.5 rounded-xl font-medium transition-all"
                      style={{
                        minWidth: 72,
                        fontSize: 12,
                        background: draftFilters.transactionStatus === opt.v ? opt.color : "var(--cream)",
                        color: draftFilters.transactionStatus === opt.v ? "#fff" : opt.color,
                        border: `1px solid ${draftFilters.transactionStatus === opt.v ? opt.color : "var(--sand)"}`,
                        cursor: "pointer",
                      }}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
                  <Building2 size={12} style={{ color: "var(--maroon)" }} />
                  Department
                </label>
                <div className="relative">
                  <select
                    value={draftFilters.departmentId}
                    disabled={departmentsLoading}
                    onChange={(e) => {
                      const departmentId = e.target.value;

                      if (!departmentId) {
                        setSelectedDepartment(null);
                        setDraftFilters({ ...draftFilters, departmentId: "" });
                        return;
                      }

                      const selected = departmentOptions.find((d) => d.id === departmentId);
                      setSelectedDepartment(selected?.raw ?? null);
                      setDraftFilters({ ...draftFilters, departmentId });
                    }}
                    className="appearance-none w-full rounded-xl pr-8 pl-3 py-2.5 outline-none"
                    style={{ fontSize: 13, background: "var(--cream)", border: "1px solid var(--sand)", color: "var(--text-dark)" }}
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
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
                  <MapPin size={12} style={{ color: "var(--maroon)" }} />
                  Place / Site
                </label>
                <div className="relative">
                  <select
                    value={draftFilters.placeId}
                    disabled={placesLoading}
                    onChange={(e) => setDraftFilters({ ...draftFilters, placeId: e.target.value })}
                    className="appearance-none w-full rounded-xl pr-8 pl-3 py-2.5 outline-none"
                    style={{ fontSize: 13, background: "var(--cream)", border: "1px solid var(--sand)", color: "var(--text-dark)" }}
                  >
                    <option value="">
                      {placesLoading
                        ? "Loading Places..."
                        : placesError
                        ? "Places unavailable"
                        : "All Places"}
                    </option>
                    {placeOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: "1px solid var(--sand)", background: "var(--cream)" }}>
              <button
                onClick={() => {
                  setSelectedDepartment(null);
                  setDraftFilters({
                    startDate: "",
                    endDate: "",
                    dateType: "visit",
                    bookingType: "",
                    transactionStatus: "ALL",
                    departmentId: "",
                    placeId: "",
                  });
                }}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 font-medium"
                style={{ fontSize: 13, background: "#fff", border: "1px solid var(--sand)", color: "var(--text-muted)", cursor: bookingsLoading ? "not-allowed" : "pointer", opacity: bookingsLoading ? 0.6 : 1 }}
                disabled={bookingsLoading}
              >
                <X size={13} /> Reset All
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={closeFilters}
                  className="rounded-xl px-5 py-2.5 font-medium"
                  style={{ fontSize: 13, background: "#fff", border: "1px solid var(--sand)", color: "var(--text-mid)", cursor: bookingsLoading ? "not-allowed" : "pointer", opacity: bookingsLoading ? 0.6 : 1 }}
                  disabled={bookingsLoading}
                >
                  Cancel
                </button>
                <button
                  className="flex items-center gap-2 rounded-xl px-6 py-2.5 font-medium text-white"
                  style={{ fontSize: 13, background: "linear-gradient(135deg, var(--maroon), var(--maroon-light))", cursor: bookingsLoading ? "not-allowed" : "pointer", opacity: bookingsLoading ? 0.6 : 1 }}
                  disabled={bookingsLoading}
                  onClick={() => {
                    setAppliedFilters(draftFilters);
                    setHasAppliedFilters(true);
                    setAppliedSearch(draftSearch);
                    setCurrentPage(1);
                    setFiltersOpen(false);
                  }}
                >
                  <SlidersHorizontal size={13} />
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {false && filtersOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-hidden">
          <div className="bg-white rounded-2xl w-[980px] max-w-[95vw] max-h-[85vh] overflow-y-auto p-6 shadow-xl border">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold text-[#5c1c1c]">Filters</h2>
                <p className="text-xs text-gray-500">Adjust filters and submit to apply</p>
              </div>
              <button
                onClick={closeFilters}
                className="text-gray-500 hover:text-black"
                aria-label="Close filters"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
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
                  <option value="ALL">ALL</option>
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

              {/* Place */}
              <div className="flex flex-col">
                <label className="filter-label">Place</label>
                <select
                  className="input"
                  value={draftFilters.placeId}
                  disabled={placesLoading}
                  onChange={(e) => {
                    const placeId = e.target.value;
                    setDraftFilters({
                      ...draftFilters,
                      placeId,
                    });
                  }}
                >
                  <option value="">
                    {placesLoading
                      ? "Loading Places..."
                      : placesError
                      ? "Places unavailable"
                      : "All Places"}
                  </option>
                  {placeOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setSelectedDepartment(null);
                  setDraftFilters({
                    startDate: "",
                    endDate: "",
                    dateType: "visit",
                    bookingType: "",
                    transactionStatus: "ALL",
                    departmentId: "",
                    placeId: "",
                  });
                }}
                className="btn-reset"
                disabled={bookingsLoading}
              >
                Reset
              </button>
              <button
                onClick={closeFilters}
                className="btn-cancel"
                disabled={bookingsLoading}
              >
                Cancel
              </button>
              <button
                className="btn-pdf h-[42px] px-6"
                disabled={bookingsLoading}
                onClick={() => {
                  setAppliedFilters(draftFilters);
                  setHasAppliedFilters(true);
                  setAppliedSearch(draftSearch);
                  setCurrentPage(1);
                  setFiltersOpen(false);
                }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

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
       setSelectedDepartment(null);
                  setDraftFilters({
                    startDate: "",
                    endDate: "",
                    dateType: "visit",
                    bookingType: "",
                    transactionStatus: "ALL",
                    departmentId: "",
                    placeId: "",
                  });
      setAppliedFilters({
        startDate: "",
        endDate: "",
        dateType: "visit",
        bookingType: "",
        transactionStatus: "ALL",
        departmentId: "",
        placeId: "",
      });
      setHasAppliedFilters(false);
      setAppliedSearch("");
      setDraftSearch("");
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
            ) : !hasAppliedFilters ? (
              <tr className="border-t">
                <td className="p-6 text-center text-gray-500" colSpan={10}>
                  Select filters to load bookings data.
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr className="border-t">
                <td className="p-3 text-center text-gray-500" colSpan={10}>
                  No data found.
                </td>
              </tr>
            ) : (
              visibleBookings.map((item, i) => (
                <tr key={item.id ?? item.bookingId ?? i} className="border-t">
                  <td className="p-3">
                    <button
                      className="font-medium text-[#8b1e1e] hover:underline"
                      onClick={() => setSelectedBooking(item)}
                      title="Open booking details"
                    >
                      {item.bookingId}
                    </button>
                  </td>
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

                  <td className="p-3">
                    <div className="relative inline-block">
                      <button
                        className="px-2 py-1 rounded bg-[#f3e7df] hover:bg-[#eadfd8] text-[#5c1c1c] font-semibold"
                        onClick={() => setOpenRowActions(prev => (prev === (item.bookingId ?? String(i)) ? null : (item.bookingId ?? String(i))))}
                        aria-label="Row actions"
                        title="Actions"
                      >
                        ⋯
                      </button>

                      {openRowActions === (item.bookingId ?? String(i)) && (
                        <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-[#eadfd8] z-40 overflow-hidden">
                          <button
                            onClick={() => {
                              setSelectedBooking(item);
                              setOpenRowActions(null);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => {
                              downloadTicket(item);
                              setOpenRowActions(null);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                          >
                            Download Ticket
                          </button>
                        </div>
                      )}
                    </div>
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

        <Detail label="Booking ID" value={fmtText(selectedBooking.bookingId)} />
        <Detail label="Booking Date" value={formatEpochMaybe(selectedBooking.bookingDate)} />
        <Detail label="Visit Date" value={formatEpochMaybe(selectedBooking.visitDate)} />
        <Detail label="Emitra Transaction Id" value={detailValue(selectedBooking, ["emitraTransactionId", "emitraTxnId", "transactionId", "txnId"])} />
        <Detail label="Consumer key" value={detailValue(selectedBooking, ["consumerKey", "consumer_key", "bookingId", "booking_id"])} />
        <Detail label="Check Enc Data" value={detailValue(selectedBooking, ["checkEncData", "encDataStatus", "encStatus"])} />
        <Detail label="Check Refund Status" value={detailValue(selectedBooking, ["refundStatus", "checkRefundStatus", "refund_status"])} />
        <Detail label="Refund" value={detailValue(selectedBooking, ["refund", "refundAmount", "refund_amount"])} />
        <Detail label="District Name" value={detailValue(selectedBooking, ["districtName", "district_name"])} />
        <Detail label="Place Name" value={detailValue(selectedBooking, ["placeName", "place_name"])} />
        <Detail label="Quota Name" value={detailValue(selectedBooking, ["quotaName", "quota_name"])} />
        <Detail label="Shift Name" value={detailValue(selectedBooking, ["shiftName", "shift_name"])} />
        <Detail label="Zone Name" value={detailValue(selectedBooking, ["zoneName", "zone_name"])} />
        <Detail label="Vehicle Name" value={detailValue(selectedBooking, ["vehicleName", "vehicle_name"])} />
        <Detail label="Total Amount (INR)" value={detailValue(selectedBooking, ["totalAmount", "amount"], (v) => typeof v === "number" ? `₹${v}` : fmtText(v))} />
        <Detail label="Choice Add On Amount" value={detailValue(selectedBooking, ["choiceAddOnAmount", "choiceAddonAmount", "addOnAmountChoice"])} />
        <Detail label="Difference Amount" value={detailValue(selectedBooking, ["differenceAmount", "diffAmount"])} />
        <Detail label="Difference Amount Status" value={detailValue(selectedBooking, ["differenceAmountStatus", "diffAmountStatus"])} />
        <Detail label="Indian Citizen" value={detailValue(selectedBooking, ["indianCitizen", "indian_citizen"])} />
        <Detail label="Indian Student" value={detailValue(selectedBooking, ["indianStudent", "indian_student"])} />
        <Detail label="Foreign Citizen" value={detailValue(selectedBooking, ["foreignCitizen", "foreign_citizen"])} />
        <Detail label="Total Visitors" value={detailValue(selectedBooking, ["totalVisitors", "visitors"])} />
        <Detail label="Add On Count" value={detailValue(selectedBooking, ["addOnCount", "addonCount"])} />
        <Detail label="Add On Sum" value={detailValue(selectedBooking, ["addOnSum", "addonSum"])} />
        <Detail label="Booking Mode" value={detailValue(selectedBooking, ["bookingMode", "mode"])} />
        <Detail label="Transaction Status" value={detailValue(selectedBooking, ["transactionStatus", "paymentStatus", "status"])} />
        <Detail label="Vehicle Number" value={detailValue(selectedBooking, ["vehicleNumber", "vehicle_no"])} />
        <Detail label="Guide Name" value={detailValue(selectedBooking, ["guideName", "guide_name"])} />
        <Detail label="Boarding Pass Status" value={detailValue(selectedBooking, ["boardingPassStatus", "boarding_pass_status"])} />
        <Detail label="SSO Id" value={detailValue(selectedBooking, ["ssoId", "sso_id"])} />
        <Detail label="Check In" value={detailValue(selectedBooking, ["checkIn", "check_in"])} />
        <Detail label="Created By" value={detailValue(selectedBooking, ["createdBy", "created_by"])} />
        <Detail label="Ip Address" value={detailValue(selectedBooking, ["ipAddress", "ip_address"])} />
        <Detail label="Device" value={detailValue(selectedBooking, ["device", "deviceType"])} />
        <Detail label="Driver Verify" value={detailValue(selectedBooking, ["driverVerify", "driver_verify"])} />
        <Detail label="Guide Verify" value={detailValue(selectedBooking, ["guideVerify", "guide_verify"])} />
        <Detail label="Payment Verify" value={detailValue(selectedBooking, ["paymentVerify", "payment_verify"])} />
        <Detail label="Driver Verify Time" value={detailValue(selectedBooking, ["driverVerifyTime", "driver_verify_time"])} />
        <Detail label="Guide Verify Time" value={detailValue(selectedBooking, ["guideVerifyTime", "guide_verify_time"])} />

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
