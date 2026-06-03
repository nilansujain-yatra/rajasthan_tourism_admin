'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Download, Filter, Search, ChevronLeft, ChevronRight,
  X, ChevronDown, ChevronRight as ChevronRightIcon,
  Calendar, CheckCircle2, XCircle, Clock, AlertCircle,
  SlidersHorizontal, Ticket,
} from 'lucide-react'
import React from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { authFetch } from '@/lib/api/authFetch'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MISRow {
  srNo:                   number
  bookingDate:            string
  visitDate:              string
  bookingId:              string
  emitraTransactionId:    string
  consumerKey:            string
  checkRefundStatus:      string
  refund:                 string
  districtName:           string
  placeName:              string
  quotaName:              string
  shiftName:              string
  zoneName:               string
  vehicleName:            string
  totalAmount:            number
  choiceAddOnAmount:      number
  differenceAmount:       number
  differenceAmountStatus: string
  indianCitizen:          number
  indianStudent:          number
  foreignCitizen:         number
  foreignStudent?:        number
  totalVisitors:          number
  addOnCount:             number
  addOnSum:               number
  bookingMode:            'ONLINE' | 'KIOSK' | 'COUNTER'
  transactionStatus:      'SUCCESS' | 'FAILED' | 'PENDING' | 'REFUNDED'
  vehicleNumber:          string
  guideName:              string
  boardingPassStatus:     string
  ssoId:                  string
  checkIn:                string
  createdBy:              string
  ipAddress:              string
  device:                 string
  driverVerify:           'Verified' | 'Not Verified' | 'N/A'
  guideVerify:            'Verified' | 'Not Verified' | 'N/A'
  paymentVerify:          'Verified' | 'Not Verified' | 'N/A'
  driverVerifyTime:       string
  guideVerifyTime:        string
}

type Department = {
  deptId?: string | number
  deptName?: string
  id?: string | number
  name?: string
  [key: string]: unknown
}

type Place = {
  placeId?: string | number
  placeName?: string
  id?: string | number
  name?: string
  [key: string]: unknown
}

type DraftFilters = {
  dateType: 'visit' | 'booking'
  startDate: string
  endDate: string
  bookingType: string
  transactionStatus: string
  departmentId: string
  placeId: string
}

// ─── Sample data ──────────────────────────────────────────────────────────────

const SAMPLE_DATA: MISRow[] = [
  {
    srNo: 1, bookingDate: '14-01-2026 | 03:19:30 PM', visitDate: '01-04-2026',
    bookingId: 'BEE2601141519307160', emitraTransactionId: '260747500077',
    consumerKey: 'BEE2601141519307160', 
    checkRefundStatus: 'N/A', refund: 'Not Refunded',
    districtName: 'Jaipur', placeName: 'Beed Papad Leopard Safari',
    quotaName: 'Normal', shiftName: 'Morning Shift', zoneName: 'Beed Papad',
    vehicleName: 'Gypsy', totalAmount: 1709,
    choiceAddOnAmount: 0, differenceAmount: 0, differenceAmountStatus: 'No difference amount',
    indianCitizen: 2, indianStudent: 0, foreignCitizen: 0, totalVisitors: 2,
    addOnCount: 0, addOnSum: 0, bookingMode: 'ONLINE', transactionStatus: 'SUCCESS',
    vehicleNumber: '—', guideName: '—', boardingPassStatus: 'Not Confirmed',
    ssoId: 'Amitanshu Das', checkIn: '—', createdBy: 'Guest User',
    ipAddress: '103.54.135.34', device: 'Web',
    driverVerify: 'Not Verified', guideVerify: 'Not Verified', paymentVerify: 'Not Verified',
    driverVerifyTime: 'N/A', guideVerifyTime: 'N/A',
  },
  {
    srNo: 2, bookingDate: '29-01-2026 | 08:05:01 PM', visitDate: '01-04-2026',
    bookingId: 'JHA2601292005013678', emitraTransactionId: '260748200088',
    consumerKey: 'JHA2601292005013678', 
    checkRefundStatus: 'N/A', refund: 'Not Refunded',
    districtName: 'Jaipur', placeName: 'Jhalana/amagarh Leopard Conservation Reserve',
    quotaName: 'Normal', shiftName: 'Morning Shift', zoneName: 'Jhalana',
    vehicleName: 'Gypsy', totalAmount: 881,
    choiceAddOnAmount: 0, differenceAmount: 0, differenceAmountStatus: 'No difference amount',
    indianCitizen: 1, indianStudent: 0, foreignCitizen: 0, totalVisitors: 1,
    addOnCount: 0, addOnSum: 0, bookingMode: 'ONLINE', transactionStatus: 'SUCCESS',
    vehicleNumber: 'RJ14CA1234', guideName: '—', boardingPassStatus: 'Not Confirmed',
    ssoId: 'RajeshSharma01', checkIn: '—', createdBy: 'Rajesh Sharma',
    ipAddress: '122.168.44.21', device: 'Mobile',
    driverVerify: 'Verified', guideVerify: 'Not Verified', paymentVerify: 'Verified',
    driverVerifyTime: '01-04-2026 07:45 AM', guideVerifyTime: 'N/A',
  },
  {
    srNo: 3, bookingDate: '26-02-2026 | 10:38:55 AM', visitDate: '01-04-2026',
    bookingId: 'KUM260226103855987', emitraTransactionId: '260749100099',
    consumerKey: 'KUM260226103855987', 
    checkRefundStatus: 'Refunded', refund: 'Refunded',
    districtName: 'Kota', placeName: 'Mukundra Hills Tiger Reserve',
    quotaName: 'Normal', shiftName: 'Morning Shift', zoneName: 'Zone A',
    vehicleName: 'Canter', totalAmount: 3200,
    choiceAddOnAmount: 500, differenceAmount: 0, differenceAmountStatus: 'No difference amount',
    indianCitizen: 4, indianStudent: 2, foreignCitizen: 0, totalVisitors: 6,
    addOnCount: 2, addOnSum: 500, bookingMode: 'ONLINE', transactionStatus: 'REFUNDED',
    vehicleNumber: 'RJ20GA5678', guideName: 'Amar Joshi', boardingPassStatus: 'Confirmed',
    ssoId: 'PriyaMehta99', checkIn: '01-04-2026 06:30 AM', createdBy: 'Priya Mehta',
    ipAddress: '49.36.121.55', device: 'Web',
    driverVerify: 'Verified', guideVerify: 'Verified', paymentVerify: 'Not Verified',
    driverVerifyTime: '01-04-2026 06:15 AM', guideVerifyTime: '01-04-2026 06:20 AM',
  },
  {
    srNo: 4, bookingDate: '07-03-2026 | 05:32:57 PM', visitDate: '01-04-2026',
    bookingId: 'JHA2603071732578550', emitraTransactionId: '260750300111',
    consumerKey: 'JHA2603071732578550', 
    checkRefundStatus: 'N/A', refund: 'Not Refunded',
    districtName: 'Jaipur', placeName: 'Jhalana/amagarh Leopard Conservation Reserve',
    quotaName: 'Normal', shiftName: 'Evening Shift', zoneName: 'Aamagarh',
    vehicleName: 'Gypsy', totalAmount: 2124,
    choiceAddOnAmount: 0, differenceAmount: 0, differenceAmountStatus: 'No difference amount',
    indianCitizen: 3, indianStudent: 0, foreignCitizen: 2, totalVisitors: 5,
    addOnCount: 0, addOnSum: 0, bookingMode: 'KIOSK', transactionStatus: 'SUCCESS',
    vehicleNumber: 'RJ14CB9012', guideName: 'Vikram Singh', boardingPassStatus: 'Confirmed',
    ssoId: 'MohitKumar22', checkIn: '01-04-2026 03:45 PM', createdBy: 'Mohit Kumar',
    ipAddress: '192.168.1.22', device: 'Kiosk',
    driverVerify: 'Verified', guideVerify: 'Verified', paymentVerify: 'Verified',
    driverVerifyTime: '01-04-2026 03:30 PM', guideVerifyTime: '01-04-2026 03:35 PM',
  },
  {
    srNo: 5, bookingDate: '11-03-2026 | 03:55:42 PM', visitDate: '01-04-2026',
    bookingId: 'JHA2603111555425405', emitraTransactionId: '260751100122',
    consumerKey: 'JHA2603111555425405', 
    checkRefundStatus: 'N/A', refund: 'Not Refunded',
    districtName: 'Jaipur', placeName: 'Jhalana/amagarh Leopard Conservation Reserve',
    quotaName: 'Normal', shiftName: 'Morning Shift', zoneName: 'Jhalana',
    vehicleName: 'Gypsy', totalAmount: 562,
    choiceAddOnAmount: 0, differenceAmount: 0, differenceAmountStatus: 'No difference amount',
    indianCitizen: 2, indianStudent: 0, foreignCitizen: 0, totalVisitors: 2,
    addOnCount: 0, addOnSum: 0, bookingMode: 'COUNTER', transactionStatus: 'SUCCESS',
    vehicleNumber: '—', guideName: '—', boardingPassStatus: 'Not Confirmed',
    ssoId: 'SunitaDevi03', checkIn: '—', createdBy: 'Counter Staff',
    ipAddress: '10.0.0.5', device: 'Counter',
    driverVerify: 'Not Verified', guideVerify: 'Not Verified', paymentVerify: 'Verified',
    driverVerifyTime: 'N/A', guideVerifyTime: 'N/A',
  },
  {
    srNo: 6, bookingDate: '12-03-2026 | 12:11:33 PM', visitDate: '01-04-2026',
    bookingId: 'JHA2603121211338959', emitraTransactionId: '260752200133',
    consumerKey: 'JHA2603121211338959', 
    checkRefundStatus: 'N/A', refund: 'Not Refunded',
    districtName: 'Jaipur', placeName: 'Jhalana/amagarh Leopard Conservation Reserve',
    quotaName: 'Normal', shiftName: 'Morning Shift', zoneName: 'Jhalana',
    vehicleName: 'Canter', totalAmount: 3345,
    choiceAddOnAmount: 0, differenceAmount: 0, differenceAmountStatus: 'No difference amount',
    indianCitizen: 6, indianStudent: 0, foreignCitizen: 2, totalVisitors: 8,
    addOnCount: 0, addOnSum: 0, bookingMode: 'ONLINE', transactionStatus: 'SUCCESS',
    vehicleNumber: 'RJ20GB3456', guideName: 'Kavita Sharma', boardingPassStatus: 'Confirmed',
    ssoId: 'ArjunPatel44', checkIn: '01-04-2026 06:45 AM', createdBy: 'Arjun Patel',
    ipAddress: '117.55.88.12', device: 'Mobile',
    driverVerify: 'Verified', guideVerify: 'Verified', paymentVerify: 'Verified',
    driverVerifyTime: '01-04-2026 06:30 AM', guideVerifyTime: '01-04-2026 06:35 AM',
  },
  {
    srNo: 7, bookingDate: '12-03-2026 | 12:16:31 PM', visitDate: '01-04-2026',
    bookingId: 'JHA2603121216317184', emitraTransactionId: '260752300144',
    consumerKey: 'JHA2603121216317184', 
    checkRefundStatus: 'N/A', refund: 'Not Refunded',
    districtName: 'Jaipur', placeName: 'Jhalana/amagarh Leopard Conservation Reserve',
    quotaName: 'Normal', shiftName: 'Evening Shift', zoneName: 'Aamagarh',
    vehicleName: 'Gypsy', totalAmount: 501,
    choiceAddOnAmount: 0, differenceAmount: 0, differenceAmountStatus: 'No difference amount',
    indianCitizen: 1, indianStudent: 0, foreignCitizen: 0, totalVisitors: 1,
    addOnCount: 0, addOnSum: 0, bookingMode: 'ONLINE', transactionStatus: 'SUCCESS',
    vehicleNumber: '—', guideName: '—', boardingPassStatus: 'Not Confirmed',
    ssoId: 'GeetaRani77', checkIn: '—', createdBy: 'Guest User',
    ipAddress: '203.90.12.44', device: 'Web',
    driverVerify: 'Not Verified', guideVerify: 'Not Verified', paymentVerify: 'Not Verified',
    driverVerifyTime: 'N/A', guideVerifyTime: 'N/A',
  },
  {
    srNo: 8, bookingDate: '22-03-2026 | 06:33:55 PM', visitDate: '01-04-2026',
    bookingId: 'JHA2603221833559248', emitraTransactionId: '260753400155',
    consumerKey: 'JHA2603221833559248', 
    checkRefundStatus: 'N/A', refund: 'Not Refunded',
    districtName: 'Jaipur', placeName: 'Jhalana/amagarh Leopard Conservation Reserve',
    quotaName: 'Normal', shiftName: 'Morning Shift', zoneName: 'Jhalana',
    vehicleName: 'Gypsy', totalAmount: 1362,
    choiceAddOnAmount: 0, differenceAmount: 0, differenceAmountStatus: 'No difference amount',
    indianCitizen: 2, indianStudent: 0, foreignCitizen: 1, totalVisitors: 3,
    addOnCount: 0, addOnSum: 0, bookingMode: 'ONLINE', transactionStatus: 'SUCCESS',
    vehicleNumber: 'RJ14CC7890', guideName: 'Deepa Nair', boardingPassStatus: 'Confirmed',
    ssoId: 'VishalMeena55', checkIn: '01-04-2026 07:00 AM', createdBy: 'Vishal Meena',
    ipAddress: '42.110.55.99', device: 'Mobile',
    driverVerify: 'Verified', guideVerify: 'Verified', paymentVerify: 'Verified',
    driverVerifyTime: '01-04-2026 06:50 AM', guideVerifyTime: '01-04-2026 06:55 AM',
  },
  {
    srNo: 9, bookingDate: '23-03-2026 | 12:37:50 PM', visitDate: '01-04-2026',
    bookingId: 'KUM260323123750783', emitraTransactionId: '260754500166',
    consumerKey: 'KUM260323123750783', 
    checkRefundStatus: 'N/A', refund: 'Not Refunded',
    districtName: 'Kota', placeName: 'Mukundra Hills Tiger Reserve',
    quotaName: 'Forest', shiftName: 'Morning Shift', zoneName: 'Zone B',
    vehicleName: 'Canter', totalAmount: 4200,
    choiceAddOnAmount: 800, differenceAmount: 0, differenceAmountStatus: 'No difference amount',
    indianCitizen: 5, indianStudent: 3, foreignCitizen: 0, totalVisitors: 8,
    addOnCount: 3, addOnSum: 800, bookingMode: 'ONLINE', transactionStatus: 'SUCCESS',
    vehicleNumber: 'RJ45AB1234', guideName: 'Rajiv Mathur', boardingPassStatus: 'Confirmed',
    ssoId: 'NitaShah88', checkIn: '01-04-2026 06:30 AM', createdBy: 'Nita Shah',
    ipAddress: '59.90.145.77', device: 'Web',
    driverVerify: 'Verified', guideVerify: 'Verified', paymentVerify: 'Verified',
    driverVerifyTime: '01-04-2026 06:15 AM', guideVerifyTime: '01-04-2026 06:20 AM',
  },
  {
    srNo: 10, bookingDate: '23-03-2026 | 01:10:23 PM', visitDate: '01-04-2026',
    bookingId: 'KUM260323131024912', emitraTransactionId: '260754600177',
    consumerKey: 'KUM260323131024912', 
    checkRefundStatus: 'N/A', refund: 'Not Refunded',
    districtName: 'Kota', placeName: 'Mukundra Hills Tiger Reserve',
    quotaName: 'Normal', shiftName: 'Evening Shift', zoneName: 'Zone A',
    vehicleName: 'Gypsy', totalAmount: 1895,
    choiceAddOnAmount: 0, differenceAmount: 0, differenceAmountStatus: 'No difference amount',
    indianCitizen: 8, indianStudent: 0, foreignCitizen: 0, totalVisitors: 8,
    addOnCount: 0, addOnSum: 0, bookingMode: 'KIOSK', transactionStatus: 'SUCCESS',
    vehicleNumber: 'RJ13DC5678', guideName: '—', boardingPassStatus: 'Not Confirmed',
    ssoId: 'BhaveshOza99', checkIn: '—', createdBy: 'Kiosk User',
    ipAddress: '192.168.1.10', device: 'Kiosk',
    driverVerify: 'Not Verified', guideVerify: 'Not Verified', paymentVerify: 'Verified',
    driverVerifyTime: 'N/A', guideVerifyTime: 'N/A',
  },
]

const DEFAULT_START_DAY = 1774981800000

function getTodayEndMs() {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return today.getTime()
}

function getTodayStartMs() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.getTime()
}

function toDateInputValue(value: number) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getDepartmentId(dept: Department) {
  const candidate =
    dept.deptId ??
    (dept as any).departmentId ??
    dept.id ??
    (dept as any).dept_id ??
    (dept as any).department_id ??
    (dept as any).deptCode ??
    (dept as any).departmentCode

  if (typeof candidate === 'string' || typeof candidate === 'number') {
    return String(candidate)
  }

  const nameFallback = getDepartmentName(dept)
  return nameFallback || ''
}

function getDepartmentName(dept: Department) {
  const candidate =
    dept.deptName ??
    (dept as any).departmentName ??
    dept.name ??
    (dept as any).dept_nm ??
    (dept as any).department_nm ??
    (dept as any).deptDesc ??
    (dept as any).departmentDesc

  return typeof candidate === 'string' ? candidate.trim() : ''
}

function getPlaceId(place: Place) {
  const candidate =
    place.id ??
    (place as any).id ??
    place.placeId ??
    (place as any).place_id ??
    (place as any).placeCode ??
    (place as any).placecode

  if (typeof candidate === 'string' || typeof candidate === 'number') {
    return String(candidate)
  }

  const nameFallback = getPlaceName(place)
  return nameFallback || ''
}

function getPlaceName(place: Place) {
  const candidate =
    place.placeName ??
    (place as any).placename ??
    (place as any).place_name ??
    place.name ??
    (place as any).name

  return typeof candidate === 'string' ? candidate.trim() : ''
}

function findFirstArray(value: unknown, depth = 0): unknown[] | null {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object' || depth >= 4) return null

  const obj = value as Record<string, unknown>
  const preferredKeys = ['result', 'data', 'content', 'list', 'rows', 'items']

  for (const key of preferredKeys) {
    if (key in obj) {
      const found = findFirstArray(obj[key], depth + 1)
      if (found) return found
    }
  }

  for (const child of Object.values(obj)) {
    const found = findFirstArray(child, depth + 1)
    if (found) return found
  }

  return null
}

function extractDepartments(payload: unknown): Department[] {
  const list = findFirstArray(payload)
  if (!list) return []
  return list.filter(item => item && typeof item === 'object') as Department[]
}

function extractPlaces(payload: unknown): Place[] {
  const list = findFirstArray(payload)
  if (!list) return []
  return list.filter(item => item && typeof item === 'object') as Place[]
}

function extractMisRows(payload: unknown) {
  const list = findFirstArray(payload)
  if (!list) return [] as Record<string, unknown>[]
  return list.filter(item => item && typeof item === 'object') as Record<string, unknown>[]
}

function extractTotalRecords(payload: unknown) {
  if (!payload || typeof payload !== 'object') return 0

  const root = payload as Record<string, any>
  const candidate =
    root?.result?.totalRecords ??
    root?.result?.total ??
    root?.totalRecords ??
    root?.total ??
    root?.result?.meta?.totalRecords ??
    root?.meta?.totalRecords

  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : 0
}

function getAny(obj: unknown, keys: string[]) {
  if (!obj || typeof obj !== 'object') return undefined
  for (const key of keys) {
    const value = (obj as any)[key]
    if (value !== undefined && value !== null && (typeof value !== 'string' || value.trim() !== '')) {
      return value
    }
  }
  return undefined
}

function toText(value: unknown, fallback = 'N/A') {
  if (typeof value === 'string') return value.trim() || fallback
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return fallback
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

function formatEpochDate(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('en-IN')
    }
  }

  if (typeof value === 'string' && value.trim()) return value
  return '—'
}

function formatEpochDateTime(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return `${date.toLocaleDateString('en-IN')} | ${date.toLocaleTimeString('en-IN')}`
    }
  }

  if (typeof value === 'string' && value.trim()) return value
  return '—'
}

function extractTicketTypeCounts(row: Record<string, unknown>) {
  const counts = {
    indianCitizen: 0,
    indianStudent: 0,
    foreignCitizen: 0,
    foreignStudent: 0,
  }

  const ticketTypeList = getAny(row, ['ticketTypeListDtos', 'ticketTypeListDto', 'ticketTypes'])
  if (!Array.isArray(ticketTypeList)) return counts

  for (const entry of ticketTypeList) {
    if (!entry || typeof entry !== 'object') continue

    const item = entry as Record<string, unknown>
    const ticketTypeName = toText(
      getAny(item, ['ticketTypeName', 'ticketName', 'name']),
    ).toLowerCase().replace(/[^a-z]/g, '')
    const ticketCount = toNumber(getAny(item, ['ticketCount', 'count', 'qty', 'quantity']))

    if (!ticketTypeName || ticketCount <= 0) continue

    if (ticketTypeName.includes('indiancitizen')) {
      counts.indianCitizen += ticketCount
    } else if (ticketTypeName.includes('indianstudent')) {
      counts.indianStudent += ticketCount
    } else if (ticketTypeName.includes('foreigncitizen')) {
      counts.foreignCitizen += ticketCount
    } else if (ticketTypeName.includes('foreignstudent')) {
      counts.foreignStudent += ticketCount
    }
  }

  return counts
}

function mapApiRowToMisRow(row: Record<string, unknown>, index: number): MISRow {
  const bookingId = toText(getAny(row, ['bookingId', 'booking_id', 'consumerKey', 'consumer_key']), `ROW-${index + 1}`)
  const ticketTypeCounts = extractTicketTypeCounts(row)
  const indianCitizen = ticketTypeCounts.indianCitizen || toNumber(getAny(row, ['indianCitizen', 'indian_citizen']))
  const indianStudent = ticketTypeCounts.indianStudent || toNumber(getAny(row, ['indianStudent', 'indian_student']))
  const foreignCitizen = ticketTypeCounts.foreignCitizen || toNumber(getAny(row, ['foreignCitizen', 'foreign_citizen']))
  const foreignStudent = ticketTypeCounts.foreignStudent || toNumber(getAny(row, ['foreignStudent', 'foreign_student']))
  const totalVisitors = toNumber(getAny(row, ['totalVisitors', 'visitors'])) || (indianCitizen + indianStudent + foreignCitizen + foreignStudent)

  return {
    srNo: index + 1,
    bookingDate: formatEpochDateTime(getAny(row, ['bookingDate', 'booking_date'])),
    visitDate: formatEpochDate(getAny(row, ['visitDate', 'visit_date'])),
    bookingId,
    emitraTransactionId: toText(getAny(row, ['emitraTransactionId', 'emitraTxnId', 'transactionId', 'txnId']), '—'),
    consumerKey: toText(getAny(row, ['consumerKey', 'consumer_key']), bookingId),
    checkRefundStatus: toText(getAny(row, ['checkRefundStatus', 'refundStatus', 'check_refund_status']), 'N/A'),
    refund: toText(getAny(row, ['refund', 'refundAmount', 'refund_amount']), 'Not Refunded'),
    districtName: toText(getAny(row, ['districtName', 'district_name']), '—'),
    placeName: toText(getAny(row, ['placeName', 'place_name']), '—'),
    quotaName: toText(getAny(row, ['quotaName', 'quota_name']), '—'),
    shiftName: toText(getAny(row, ['shiftName', 'shift_name']), '—'),
    zoneName: toText(getAny(row, ['zoneName', 'zone_name']), '—'),
    vehicleName: toText(getAny(row, ['vehicleName', 'vehicle_name']), '—'),
    totalAmount: toNumber(getAny(row, ['totalAmount', 'amount'])),
    choiceAddOnAmount: toNumber(getAny(row, ['choiceAddOnAmount', 'choiceAddonAmount', 'addOnAmountChoice'])),
    differenceAmount: toNumber(getAny(row, ['differenceAmount', 'diffAmount'])),
    differenceAmountStatus: toText(getAny(row, ['differenceAmountStatus', 'diffAmountStatus']), 'No difference amount'),
    indianCitizen,
    indianStudent,
    foreignCitizen,
    foreignStudent,
    totalVisitors,
    addOnCount: toNumber(getAny(row, ['addOnCount', 'addonCount'])),
    addOnSum: toNumber(getAny(row, ['addOnSum', 'addonSum'])),
    bookingMode: toText(getAny(row, ['bookingMode', 'mode']), 'ONLINE') as MISRow['bookingMode'],
    transactionStatus: toText(getAny(row, ['transactionStatus', 'paymentStatus', 'status']), 'SUCCESS') as MISRow['transactionStatus'],
    vehicleNumber: toText(getAny(row, ['vehicleNumber', 'vehicle_no']), '—'),
    guideName: toText(getAny(row, ['guideName', 'guide_name']), '—'),
    boardingPassStatus: toText(getAny(row, ['boardingPassStatus', 'boarding_pass_status']), 'Not Confirmed'),
    ssoId: toText(getAny(row, ['ssoId', 'sso_id']), '—'),
    checkIn: toText(getAny(row, ['checkIn', 'check_in']), '—'),
    createdBy: toText(getAny(row, ['createdBy', 'created_by']), 'Guest User'),
    ipAddress: toText(getAny(row, ['ipAddress', 'ip_address']), '—'),
    device: toText(getAny(row, ['device', 'deviceType']), '—'),
    driverVerify: toText(getAny(row, ['driverVerify', 'driver_verify']), 'N/A') as MISRow['driverVerify'],
    guideVerify: toText(getAny(row, ['guideVerify', 'guide_verify']), 'N/A') as MISRow['guideVerify'],
    paymentVerify: toText(getAny(row, ['paymentVerify', 'payment_verify']), 'N/A') as MISRow['paymentVerify'],
    driverVerifyTime: toText(getAny(row, ['driverVerifyTime', 'driver_verify_time']), 'N/A'),
    guideVerifyTime: toText(getAny(row, ['guideVerifyTime', 'guide_verify_time']), 'N/A'),
  }
}

// ─── Column group config ──────────────────────────────────────────────────────

const COL_GROUPS = [
  { label: 'Booking Info',    color: '#8B1A1A', cols: 9  },
  { label: 'Amount & Fees',   color: '#C8922A', cols: 4  },
  { label: 'Visitors',        color: '#1A7A6E', cols: 5  },
  { label: 'Add-On',          color: '#5A3A1A', cols: 2  },
  { label: 'Booking',         color: '#6B1212', cols: 2  },
  { label: 'Field Ops',       color: '#1A7A6E', cols: 4  },
  { label: 'Session',         color: '#C8922A', cols: 4  },
  { label: 'Verification',    color: '#8B1A1A', cols: 5  },
]

// ─── Status style maps ────────────────────────────────────────────────────────

const txnStyle: Record<string, { bg: string; color: string }> = {
  SUCCESS:  { bg: 'rgba(26,122,110,0.12)',  color: '#1A7A6E' },
  FAILED:   { bg: 'rgba(229,62,62,0.1)',    color: '#E53E3E' },
  PENDING:  { bg: 'rgba(200,146,42,0.12)',  color: '#C8922A' },
  REFUNDED: { bg: 'rgba(90,58,26,0.1)',     color: '#5A3A1A' },
}

const modeStyle: Record<string, { bg: string; color: string }> = {
  ONLINE:  { bg: 'rgba(26,122,110,0.12)',  color: '#1A7A6E' },
  KIOSK:   { bg: 'rgba(200,146,42,0.12)', color: '#C8922A' },
  COUNTER: { bg: 'rgba(139,26,26,0.1)',   color: '#8B1A1A' },
}

function VerifyChip({ val }: { val: string }) {
  if (val === 'Verified')     return <span style={{ fontSize: 9, fontWeight: 600, color: '#1A7A6E', display: 'flex', alignItems: 'center', gap: 3 }}><CheckCircle2 size={11} /> Verified</span>
  if (val === 'Not Verified') return <span style={{ fontSize: 9, fontWeight: 500, color: '#9A7A5A', display: 'flex', alignItems: 'center', gap: 3 }}><XCircle size={11} /> Not Verified</span>
  return <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>N/A</span>
}

const tdBase: React.CSSProperties = { padding: '7px 10px', fontSize: 11, borderBottom: '1px solid var(--cream-dark)', verticalAlign: 'middle', whiteSpace: 'nowrap' }
const tdNum:  React.CSSProperties = { ...tdBase, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }
const thBase: React.CSSProperties = { padding: '7px 10px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.6px', whiteSpace: 'nowrap', borderRight: '1px solid rgba(255,255,255,0.15)' }

function Th({ label, group }: { label: string; group: string }) {
  const bg: Record<string, string> = {
    booking:   'rgba(139,26,26,0.06)',
    amount:    'rgba(200,146,42,0.06)',
    visitors:  'rgba(26,122,110,0.06)',
    addon:     'rgba(90,58,26,0.06)',
    bkgstatus: 'rgba(107,18,18,0.06)',
    fieldops:  'rgba(26,122,110,0.06)',
    session:   'rgba(200,146,42,0.06)',
    verify:    'rgba(139,26,26,0.06)',
  }
  return (
    <th style={{ ...thBase, background: bg[group] ?? 'var(--cream-dark)', color: 'var(--text-mid)', borderBottom: '2px solid var(--sand)', borderRight: '1px solid var(--sand)' }}>
      {label}
    </th>
  )
}

function PageBtn({ onClick, disabled, active, icon, label }: { onClick: ()=>void; disabled?: boolean; active?: boolean; icon?: React.ReactNode; label?: string }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="rounded-lg flex items-center justify-center font-medium gap-0.5 px-1"
      style={{ minWidth: 28, height: 28, fontSize: 11, background: active ? 'var(--maroon)' : 'transparent', color: active ? '#fff' : disabled ? 'var(--text-muted)' : 'var(--text-mid)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1 }}
    >
      {icon ?? label}
    </button>
  )
}

function FilterSelect({ label, value, options, onChange, disabled = false }: { label: string; value: string; options: { v: string; l: string }[]; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <label style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase' as const }}>{label}</label>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
          className="appearance-none rounded-xl pr-7 pl-3 py-2 outline-none"
          style={{ fontSize: 12, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-dark)', minWidth: 130, opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
        >
          {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
      </div>
    </div>
  )
}

// ─── Expanded row detail panel ────────────────────────────────────────────────

function ExpandedRow({ row }: { row: MISRow }) {
  const sections = [
    {
      title: '🔐 Transaction & Refund',
      color: '#8B1A1A',
      fields: [
        { label: 'Booking ID',          val: row.bookingId },
        { label: 'Emitra Trans. ID',    val: row.emitraTransactionId },
        { label: 'Consumer Key',        val: row.consumerKey },
        { label: 'Check Refund Status', val: row.checkRefundStatus },
        { label: 'Refund',              val: row.refund },
      ],
    },
    {
      title: '📍 Location & Safari',
      color: '#1A7A6E',
      fields: [
        { label: 'District',    val: row.districtName },
        { label: 'Place',       val: row.placeName },
        { label: 'Quota',       val: row.quotaName },
        { label: 'Shift',       val: row.shiftName },
        { label: 'Zone',        val: row.zoneName },
        { label: 'Vehicle',     val: row.vehicleName },
        { label: 'Veh. Number', val: row.vehicleNumber },
      ],
    },
    {
      title: '💰 Amounts',
      color: '#C8922A',
      fields: [
        { label: 'Total Amount',      val: `₹${row.totalAmount.toLocaleString('en-IN')}` },
        { label: 'Add-On Amount',     val: `₹${row.choiceAddOnAmount.toLocaleString('en-IN')}` },
        { label: 'Difference Amt',    val: `₹${row.differenceAmount.toLocaleString('en-IN')}` },
        { label: 'Diff. Amt Status',  val: row.differenceAmountStatus },
        { label: 'Add-On Count',      val: String(row.addOnCount) },
        { label: 'Add-On Sum',        val: `₹${row.addOnSum.toLocaleString('en-IN')}` },
      ],
    },
    {
      title: '👥 Visitors',
      color: '#1A7A6E',
      fields: [
        { label: 'Indian Citizen',  val: String(row.indianCitizen) },
        { label: 'Indian Student',  val: String(row.indianStudent) },
        { label: 'Foreign Citizen', val: String(row.foreignCitizen) },
        { label: 'Foreign Student', val: String(row.foreignStudent ?? 0) },
        { label: 'Total Visitors',  val: String(row.totalVisitors) },
      ],
    },
    {
      title: '🖥️ Session & Device',
      color: '#5A3A1A',
      fields: [
        { label: 'SSO Id',       val: row.ssoId },
        { label: 'Created By',   val: row.createdBy },
        { label: 'IP Address',   val: row.ipAddress },
        { label: 'Device',       val: row.device },
        { label: 'Check In',     val: row.checkIn },
        { label: 'Boarding Pass',val: row.boardingPassStatus },
      ],
    },
    {
      title: '✅ Verification',
      color: '#6B1212',
      fields: [
        { label: 'Driver Verify',      val: row.driverVerify },
        { label: 'Guide Verify',       val: row.guideVerify },
        { label: 'Payment Verify',     val: row.paymentVerify },
        { label: 'Driver Verify Time', val: row.driverVerifyTime },
        { label: 'Guide Verify Time',  val: row.guideVerifyTime },
        { label: 'Guide Name',         val: row.guideName },
      ],
    },
  ]

  return (
    <tr>
      <td colSpan={50} style={{ padding: '0 0 0 48px', background: 'rgba(139,26,26,0.02)', borderBottom: '2px solid var(--maroon)' }}>
        <div className="grid gap-3 py-4 pr-6" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {sections.map(sec => (
            <div key={sec.title} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${sec.color}22` }}>
              <div className="px-3 py-2 font-semibold" style={{ fontSize: 11, background: `${sec.color}12`, color: sec.color, borderBottom: `1px solid ${sec.color}22` }}>
                {sec.title}
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 px-3 py-2.5">
                {sec.fields.map(f => (
                  <div key={f.label}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{f.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dark)', fontWeight: 500, marginTop: 1, wordBreak: 'break-all' }}>{f.val || '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </td>
    </tr>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface MISReportViewProps {
  data?:          MISRow[]
  title?:         string
  totalResults?:  number
  lockedPlaceId?: string
  lockedPlaceName?: string
  lockedDepartmentId?: string
}

export default function MISReportView({
  data          = SAMPLE_DATA,
  title         = 'MIS Report',
  totalResults  = 1803,
  lockedPlaceId = '',
  lockedPlaceName,
  lockedDepartmentId = '',
}: MISReportViewProps) {
  void data
  void totalResults

  const todayMaxDate = useMemo(() => toDateInputValue(getTodayEndMs()), [])
  const todayStartDate = useMemo(() => toDateInputValue(DEFAULT_START_DAY), [])
  const defaultFilters = useMemo<DraftFilters>(() => ({
    dateType: 'visit',
    startDate: todayStartDate,
    endDate: todayMaxDate,
    bookingType: 'ALL',
    transactionStatus: 'ALL',
    departmentId: lockedDepartmentId,
    placeId: lockedPlaceId,
  }), [lockedDepartmentId, lockedPlaceId, todayMaxDate, todayStartDate])
  const placeLocked = Boolean(lockedPlaceId)
  const departmentLocked = Boolean(lockedDepartmentId)

  const [rows, setRows] = useState<MISRow[]>([])
  const [searchBookingId, setSearchBookingId] = useState('')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [draftFilters, setDraftFilters] = useState<DraftFilters>(defaultFilters)
  const [appliedFilters, setAppliedFilters] = useState<DraftFilters>(defaultFilters)
  const [departments, setDepartments] = useState<Department[]>([])
  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [departmentsError, setDepartmentsError] = useState('')
  const [places, setPlaces] = useState<Place[]>([])
  const [placesLoading, setPlacesLoading] = useState(false)
  const [placesError, setPlacesError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [totalRecords, setTotalRecords] = useState(0)

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }
  const paged = rows
  const totalPages = Math.max(1, Math.ceil((totalRecords || 0) / pageSize))
  const grandTotal = useMemo(() => rows.reduce((s, r) => s + r.totalAmount, 0), [rows])
  const totalVisitors = useMemo(() => rows.reduce((s, r) => s + r.totalVisitors, 0), [rows])
  const firstResult = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1
  const lastResult = totalRecords === 0 ? 0 : Math.min(page * pageSize, totalRecords)
  const activeDepartment = departments.find(department => getDepartmentId(department) === appliedFilters.departmentId)
  const activePlace = places.find(place => getPlaceId(place) === appliedFilters.placeId)
  const activeDepartmentName = activeDepartment ? getDepartmentName(activeDepartment) : ''
  const activePlaceName = placeLocked ? (lockedPlaceName || activePlace?.placeName || '') : activePlace ? getPlaceName(activePlace) : ''

  useEffect(() => {
    setDraftFilters(defaultFilters)
    setAppliedFilters(defaultFilters)
  }, [defaultFilters])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  useEffect(() => {
    let active = true

    const loadDepartments = async () => {
      setDepartmentsLoading(true)
      setDepartmentsError('')
      try {
        const response = await authFetch('/dept?offset=0&size=200&export=false&searchKey=', {
          cache: 'no-store',
        })
        if (!response.ok) {
          throw new Error(`Department request failed with ${response.status}`)
        }
        const payload = await response.json()
        if (!active) return
        setDepartments(extractDepartments(payload))
      } catch (err) {
        if (!active) return
        setDepartments([])
        setDepartmentsError(err instanceof Error ? err.message : 'Unable to load departments.')
      } finally {
        if (active) {
          setDepartmentsLoading(false)
        }
      }
    }

    loadDepartments()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    const loadPlaces = async () => {
      setPlacesLoading(true)
      setPlacesError('')
      try {
        const params = new URLSearchParams({
          districtId: '',
          searchKey: '',
          deptList: appliedFilters.departmentId,
          size: '2000',
        })
        const response = await authFetch(`/place?${params.toString()}`, { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(`Place request failed with ${response.status}`)
        }
        const payload = await response.json()
        if (!active) return
        const nextPlaces = extractPlaces(payload)
        setPlaces(nextPlaces)

        if (!placeLocked && appliedFilters.placeId && !nextPlaces.some(place => getPlaceId(place) === appliedFilters.placeId)) {
          setDraftFilters(current => ({ ...current, placeId: '' }))
          setAppliedFilters(current => ({ ...current, placeId: '' }))
          setPage(1)
        }
      } catch (err) {
        if (!active) return
        setPlaces([])
        setPlacesError(err instanceof Error ? err.message : 'Unable to load places.')
      } finally {
        if (active) {
          setPlacesLoading(false)
        }
      }
    }

    loadPlaces()

    return () => {
      active = false
    }
  }, [appliedFilters.departmentId, appliedFilters.placeId, placeLocked])

  useEffect(() => {
    let active = true

    const loadRows = async () => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({
          bookingType: appliedFilters.bookingType,
          divisionId: '',
          districtId: '',
          endDay: String(new Date(`${appliedFilters.endDate}T23:59:59.999`).getTime()),
          offSet: String(page),
          placeId: appliedFilters.placeId,
          size: String(pageSize),
          startDay: String(new Date(`${appliedFilters.startDate}T00:00:00.000`).getTime()),
          transactionStatus: appliedFilters.transactionStatus === 'ALL' ? '' : appliedFilters.transactionStatus,
          departmentId: appliedFilters.departmentId,
          isFilter: 'true',
          dateFilter: appliedFilters.dateType === 'visit' ? 'Visit' : 'Booking',
          searchKey: searchBookingId.trim(),
          printCount: 'ALL',
          ticketType: '',
          zoneId: '',
          shiftId: '',
          quotaId: '',
          inventoryId: '',
          entryVerify: 'ALL',
          driverVerify: 'ALL',
        })

        const response = await authFetch(`/inventory/reports/mis_V3?${params.toString()}`, {
          cache: 'no-store',
        })
        if (!response.ok) {
          throw new Error(`MIS inventory request failed with ${response.status}`)
        }
        const payload = await response.json()
        if (!active) return
        const nextRows = extractMisRows(payload).map(mapApiRowToMisRow)
        setRows(nextRows)
        setTotalRecords(extractTotalRecords(payload) || nextRows.length)
      } catch (err) {
        if (!active) return
        setRows([])
        setTotalRecords(0)
        setError(err instanceof Error ? err.message : 'Unable to load MIS inventory data.')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadRows()

    return () => {
      active = false
    }
  }, [appliedFilters, page, pageSize, searchBookingId])

  const openFilters = () => {
    setDraftFilters(appliedFilters)
    setFiltersOpen(true)
  }

  const closeFilters = () => {
    setDraftFilters(appliedFilters)
    setFiltersOpen(false)
  }

  const applyFilters = () => {
    setAppliedFilters(draftFilters)
    setPage(1)
    setFiltersOpen(false)
  }

  const resetFilters = () => {
    setDraftFilters(defaultFilters)
    setAppliedFilters(defaultFilters)
    setSearchBookingId('')
    setPage(1)
    setFiltersOpen(false)
  }

  const exportPDF = () => {
    const pdf = new jsPDF('l', 'mm', 'a4')
    pdf.setFontSize(14)
    pdf.text(title, 14, 14)
    autoTable(pdf, {
      startY: 20,
      styles: { fontSize: 7, cellPadding: 2 },
      head: [[
        'Booking Date',
        'Visit Date',
        'Booking ID',
        'District',
        'Place',
        'Mode',
        'Txn Status',
        'Visitors',
        'Amount',
      ]],
      body: rows.map(row => [
        row.bookingDate,
        row.visitDate,
        row.bookingId,
        row.districtName,
        row.placeName,
        row.bookingMode,
        row.transactionStatus,
        String(row.totalVisitors),
        String(row.totalAmount),
      ]),
    })
    pdf.save('mis-inventory-report.pdf')
  }

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", color: 'var(--text-dark)' }}>

      {/* ── Top bar ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--sand)', background: '#fff' }}>
        <div>
          <h2 className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>{title}</h2>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Inventory Reports · Management Information System</p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Search by booking ID */}
          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--cream-dark)', border: '1px solid var(--sand)', minWidth: 240 }}>
            <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              value={searchBookingId}
              onChange={e => { setSearchBookingId(e.target.value); setPage(1) }}
              placeholder="Search with Booking ID…"
              className="bg-transparent outline-none flex-1"
              style={{ fontSize: 12, color: 'var(--text-dark)' }}
            />
            {searchBookingId && <button onClick={() => setSearchBookingId('')}><X size={11} style={{ color: 'var(--text-muted)' }} /></button>}
          </div>

          <button
            onClick={openFilters}
            className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium"
            style={{ fontSize: 12, background: filtersOpen ? 'var(--maroon)' : 'var(--cream-dark)', border: '1px solid ' + (filtersOpen ? 'var(--maroon)' : 'var(--sand)'), color: filtersOpen ? '#fff' : 'var(--text-mid)' }}
          >
            <Filter size={13} /> Filter
          </button>

          <button onClick={exportPDF} className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium text-white"
            style={{ fontSize: 12, background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))' }}
          >
            <Download size={13} /> Export PDF
          </button>
        </div>
      </div>

      {/* ── Active filter strip ───────────────────────────────── */}
      <div className="flex items-center gap-5 px-6 py-2.5 flex-wrap" style={{ background: 'var(--cream)', borderBottom: '1px solid var(--sand)' }}>
        {[
          { label: 'Date Type', val: appliedFilters.dateType === 'visit' ? 'Visit Date' : 'Booking Date' },
          { label: 'Start Date', val: appliedFilters.startDate ? new Date(appliedFilters.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-' },
          { label: 'End Date', val: appliedFilters.endDate ? new Date(appliedFilters.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-' },
          { label: 'Booking Type', val: appliedFilters.bookingType === 'ALL' ? 'All' : appliedFilters.bookingType === 'KIOSK' ? 'OFFLINE' : appliedFilters.bookingType },
          { label: 'Payment Type', val: appliedFilters.transactionStatus === 'ALL' ? 'All' : appliedFilters.transactionStatus },
          { label: 'Department', val: activeDepartmentName || 'All' },
          { label: 'Place', val: activePlaceName || 'All' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>{item.label} :</span>
            <span className="rounded-full px-2.5 py-0.5 font-medium" style={{ fontSize: 11, background: 'rgba(139,26,26,0.07)', color: 'var(--maroon)' }}>{item.val}</span>
          </div>
        ))}
      </div>

      {/* ── Filter panel ─────────────────────────────────────── */}
            {filtersOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15, 23, 42, 0.34)' }}
          onClick={closeFilters}
        >
          <div
            className="w-full max-w-5xl overflow-hidden rounded-2xl"
            style={{ background: '#fff', boxShadow: '0 24px 70px rgba(15, 23, 42, 0.22)' }}
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 text-white" style={{ background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))' }}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(255,255,255,0.14)' }}>
                  <SlidersHorizontal size={18} />
                </div>
                <div>
                  <div className="font-serif font-bold" style={{ fontSize: 20 }}>Filter Inventory MIS</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)' }}>Same inventory flow as Booking Management</div>
                </div>
              </div>
              <button onClick={closeFilters} className="rounded-full p-2" style={{ background: 'rgba(255,255,255,0.12)' }}>
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2 border-b px-6 py-3" style={{ borderColor: 'var(--sand)', background: 'var(--cream)' }}>
              {[
                appliedFilters.dateType === 'visit' ? 'Visit Date' : 'Booking Date',
                appliedFilters.bookingType === 'ALL' ? 'All Booking Types' : appliedFilters.bookingType === 'KIOSK' ? 'OFFLINE' : appliedFilters.bookingType,
                appliedFilters.transactionStatus === 'ALL' ? 'All Statuses' : appliedFilters.transactionStatus,
                activeDepartmentName || 'All Departments',
                activePlaceName || 'All Places',
              ].map(chip => (
                <span key={chip} className="rounded-full px-3 py-1" style={{ fontSize: 11, background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontWeight: 600 }}>
                  {chip}
                </span>
              ))}
            </div>

            <div className="grid gap-5 px-6 py-5 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Date Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'visit', label: 'Visit Date', icon: <Calendar size={14} /> },
                    { value: 'booking', label: 'Booking Date', icon: <Ticket size={14} /> },
                  ].map(option => {
                    const active = draftFilters.dateType === option.value
                    return (
                      <button
                        key={option.value}
                        onClick={() => setDraftFilters(current => ({ ...current, dateType: option.value as DraftFilters['dateType'] }))}
                        className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium"
                        style={{ fontSize: 12, border: `1px solid ${active ? 'var(--maroon)' : 'var(--sand)'}`, background: active ? 'rgba(139,26,26,0.08)' : '#fff', color: active ? 'var(--maroon)' : 'var(--text-mid)' }}
                      >
                        {option.icon}
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Start Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={draftFilters.startDate}
                    max={todayMaxDate}
                    onChange={event => setDraftFilters(current => ({ ...current, startDate: event.target.value }))}
                    className="w-full rounded-xl py-3 pl-4 pr-10 outline-none"
                    style={{ fontSize: 12, border: '1px solid var(--sand)', background: '#fff', color: 'var(--text-dark)' }}
                  />
                  <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="space-y-2">
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>End Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={draftFilters.endDate}
                    max={todayMaxDate}
                    min={draftFilters.startDate}
                    onChange={event => setDraftFilters(current => ({ ...current, endDate: event.target.value }))}
                    className="w-full rounded-xl py-3 pl-4 pr-10 outline-none"
                    style={{ fontSize: 12, border: '1px solid var(--sand)', background: '#fff', color: 'var(--text-dark)' }}
                  />
                  <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="space-y-2">
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Booking Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {['ALL', 'ONLINE', 'KIOSK'].map(option => {
                    const active = draftFilters.bookingType === option
                    return (
                      <button
                        key={option}
                        onClick={() => setDraftFilters(current => ({ ...current, bookingType: option }))}
                        className="rounded-xl px-4 py-3 font-medium"
                        style={{ fontSize: 12, border: `1px solid ${active ? 'var(--maroon)' : 'var(--sand)'}`, background: active ? 'rgba(139,26,26,0.08)' : '#fff', color: active ? 'var(--maroon)' : 'var(--text-mid)' }}
                      >
                        {option === 'ALL' ? 'All' : option === 'KIOSK' ? 'OFFLINE' : option}
                      </button>
                    )
                  })}
                </div>
              </div>

              <FilterSelect
                label="Payment Status"
                value={draftFilters.transactionStatus}
                options={[{ v: 'ALL', l: 'All Statuses' }, { v: 'SUCCESS', l: 'Success' }, { v: 'FAILED', l: 'Failed' }, { v: 'PENDING', l: 'Pending' }, { v: 'REFUNDED', l: 'Refunded' }]}
                onChange={value => setDraftFilters(current => ({ ...current, transactionStatus: value }))}
              />

              <FilterSelect
                label="Department"
                value={draftFilters.departmentId}
                options={[{ v: '', l: departmentsLoading ? 'Loading departments...' : 'All Departments' }, ...departments.map(department => ({ v: getDepartmentId(department), l: getDepartmentName(department) }))]}
                onChange={value => setDraftFilters(current => ({ ...current, departmentId: value, placeId: '' }))}
                disabled={departmentLocked}
              />

              <FilterSelect
                label="Place"
                value={draftFilters.placeId}
                options={[{ v: '', l: placesLoading ? 'Loading places...' : 'All Places' }, ...places.map(place => ({ v: getPlaceId(place), l: getPlaceName(place) }))]}
                onChange={value => setDraftFilters(current => ({ ...current, placeId: value }))}
                disabled={placeLocked}
              />
            </div>

            {(departmentsError || placesError) && (
              <div className="px-6 pb-2" style={{ fontSize: 12, color: '#B42318' }}>
                {[departmentsError, placesError].filter(Boolean).join(' ')}
              </div>
            )}

            <div className="flex items-center justify-between border-t px-6 py-4" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
              <button onClick={resetFilters} className="rounded-xl px-4 py-2 font-medium" style={{ fontSize: 12, border: '1px solid var(--sand)', color: 'var(--text-mid)' }}>
                Reset All
              </button>
              <div className="flex items-center gap-3">
                <button onClick={closeFilters} className="rounded-xl px-4 py-2 font-medium" style={{ fontSize: 12, border: '1px solid var(--sand)', color: 'var(--text-mid)' }}>
                  Cancel
                </button>
                <button onClick={applyFilters} className="rounded-xl px-4 py-2 font-medium text-white" style={{ fontSize: 12, background: 'var(--maroon)' }}>
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Summary cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-3 px-6 py-4" style={{ background: 'var(--cream)' }}>
        {[
          { label: 'Total Records', val: totalRecords.toLocaleString('en-IN'), icon: '📋', color: 'var(--maroon)', bg: '#fff' },
          { label: 'Total Revenue', val: '₹' + grandTotal.toLocaleString('en-IN'), icon: '₹', color: 'var(--maroon)', bg: 'linear-gradient(135deg,#6B1212,#A83030)', white: true },
          { label: 'Total Visitors', val: totalVisitors.toLocaleString('en-IN'), icon: '👥', color: '#1A7A6E', bg: '#fff' },
          { label: 'Online Bookings', val: rows.filter(r => r.bookingMode === 'ONLINE').length.toString(), icon: '🌐', color: '#1A7A6E', bg: '#fff' },
          { label: 'Verified Trips', val: rows.filter(r => r.driverVerify === 'Verified').length.toString(), icon: '✅', color: '#C8922A', bg: '#fff' },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-4 py-3 flex items-center gap-3 relative overflow-hidden"
            style={{ background: s.bg, border: s.white ? 'none' : '1px solid var(--sand)' }}>
            {s.white && <div style={{ position: 'absolute', top: -24, right: -24, width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />}
            <span style={{ fontSize: 22, flexShrink: 0 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 10, color: s.white ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>{s.label}</div>
              <div className="font-serif font-bold" style={{ fontSize: 20, color: s.white ? '#fff' : s.color, lineHeight: 1.1 }}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table ─────────────────────────────────────────────── */}
      <div className="px-6 pb-6">
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--sand)', background: '#fff' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 2600 }}>
              <thead>
                {/* Group header row */}
                <tr>
                  {/* Expand + Sr.No */}
                  <th rowSpan={2} style={{ ...thBase, width: 32, background: 'var(--maroon)', color: '#fff', textAlign: 'center', position: 'sticky', left: 0, zIndex: 3, borderRight: '2px solid rgba(255,255,255,0.2)' }} />
                  <th rowSpan={2} style={{ ...thBase, width: 48, background: 'var(--maroon)', color: '#fff', textAlign: 'center', position: 'sticky', left: 32, zIndex: 3, borderRight: '2px solid rgba(255,255,255,0.2)' }}>Sr.</th>
                  {COL_GROUPS.map(g => (
                    <th key={g.label} colSpan={g.cols} style={{ ...thBase, background: g.color, color: '#fff', textAlign: 'center', padding: '6px 10px', fontSize: 10, borderRight: '2px solid rgba(255,255,255,0.2)' }}>
                      {g.label.toUpperCase()}
                    </th>
                  ))}
                </tr>
                {/* Sub-column headers */}
                <tr style={{ background: 'var(--cream-dark)' }}>
                  {/* Booking Info */}
                  {['Booking Date','Visit Date','Booking ID','Emitra Trans. ID','Consumer Key','District','Place','Quota','Shift / Zone'].map(h => <Th key={h} label={h} group="booking" />)}
                  {/* Amount & Fees */}
                  {['Total Amt (₹)','Add-On Amt (₹)','Diff. Amt (₹)','Diff. Status'].map(h => <Th key={h} label={h} group="amount" />)}
                  {/* Visitors */}
                  {['Indian','Student','Foreign','Total','Vehicle'].map(h => <Th key={h} label={h} group="visitors" />)}
                  {/* Add-On */}
                  {['Add-On Count','Add-On Sum (₹)'].map(h => <Th key={h} label={h} group="addon" />)}
                  {/* Booking status */}
                  {['Mode','Txn Status'].map(h => <Th key={h} label={h} group="bkgstatus" />)}
                  {/* Field Ops */}
                  {['Vehicle No.','Guide Name','Boarding Pass','Check In'].map(h => <Th key={h} label={h} group="fieldops" />)}
                  {/* Session */}
                  {['SSO Id','Created By','IP Address','Device'].map(h => <Th key={h} label={h} group="session" />)}
                  {/* Verification */}
                  {['Driver ✓','Guide ✓','Payment ✓','Driver Time','Guide Time'].map(h => <Th key={h} label={h} group="verify" />)}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr><td colSpan={50} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading inventory report...</td></tr>
                ) : error ? (
                  <tr><td colSpan={50} style={{ padding: 48, textAlign: 'center', color: '#B42318', fontSize: 13 }}>{error}</td></tr>
                ) : paged.length === 0 ? (
                  <tr><td colSpan={50} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No records match.</td></tr>
                ) : (
                  paged.map((r, i) => {
                    const isExpanded = expandedRows.has(r.bookingId)
                    const rowBg = i % 2 === 0 ? '#fff' : 'rgba(251,246,239,0.55)'
                    const txnSt = txnStyle[r.transactionStatus] ?? txnStyle.SUCCESS
                    const modeSt = modeStyle[r.bookingMode] ?? modeStyle.ONLINE

                    return (
                      
                          <React.Fragment key={r.bookingId}>

                        <tr
                          // key={r.bookingId}
                          style={{ background: rowBg, transition: 'background 0.12s', cursor: 'pointer' }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(139,26,26,0.03)')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = rowBg)}
                          onClick={() => toggleRow(r.bookingId)}
                        >
                          {/* Expand toggle */}
                          <td style={{ ...tdBase, textAlign: 'center', width: 32, background: rowBg, position: 'sticky', left: 0, zIndex: 2, borderRight: '2px solid var(--sand)', padding: '7px 6px' }}>
                            <span style={{ color: 'var(--maroon)', transition: 'transform 0.15s', display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'none' }}>
                              <ChevronRightIcon size={13} />
                            </span>
                          </td>
                          {/* Sr.No */}
                          <td style={{ ...tdBase, textAlign: 'center', fontWeight: 700, fontSize: 12, color: 'var(--maroon)', background: rowBg, position: 'sticky', left: 32, zIndex: 2, borderRight: '2px solid var(--sand)' }}>
                            {(page - 1) * pageSize + i + 1}
                          </td>

                          {/* ── Booking Info ── */}
                          <td style={{ ...tdBase }}><span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.bookingDate}</span></td>
                          <td style={{ ...tdBase, fontWeight: 500 }}>{r.visitDate}</td>
                          <td style={{ ...tdBase }}>
                            <span style={{ fontSize: 11, color: 'var(--maroon)', fontWeight: 600, fontFamily: 'monospace' }}>{r.bookingId}</span>
                          </td>
                          <td style={{ ...tdBase }}><span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{r.emitraTransactionId}</span></td>
                          <td style={{ ...tdBase }}><span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{r.consumerKey.slice(0,14)}…</span></td>
                          <td style={{ ...tdBase }}><span className="rounded-full px-2 py-0.5 font-medium" style={{ fontSize: 10, background: 'rgba(139,26,26,0.07)', color: 'var(--maroon)' }}>{r.districtName}</span></td>
                          <td style={{ ...tdBase, maxWidth: 160 }}><span className="font-serif font-semibold" style={{ fontSize: 12, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }} title={r.placeName}>{r.placeName}</span></td>
                          <td style={{ ...tdBase }}><span style={{ fontSize: 10, color: 'var(--text-mid)' }}>{r.quotaName}</span></td>
                          <td style={{ ...tdBase }}><span style={{ fontSize: 10, color: 'var(--text-mid)' }}>{r.shiftName} · {r.zoneName}</span></td>

                          {/* ── Amount ── */}
                          <td style={{ ...tdNum, fontWeight: 700, color: 'var(--maroon)', fontSize: 13 }}>₹{r.totalAmount.toLocaleString('en-IN')}</td>
                          <td style={{ ...tdNum }}>{r.choiceAddOnAmount > 0 ? `₹${r.choiceAddOnAmount.toLocaleString('en-IN')}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                          <td style={{ ...tdNum }}>{r.differenceAmount > 0 ? `₹${r.differenceAmount.toLocaleString('en-IN')}` : <span style={{ color: 'var(--text-muted)' }}>₹0</span>}</td>
                          <td style={{ ...tdBase }}><span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.differenceAmountStatus}</span></td>

                          {/* ── Visitors ── */}
                          <td style={{ ...tdNum }}>{r.indianCitizen || <span style={{ color: 'var(--text-muted)' }}>0</span>}</td>
                          <td style={{ ...tdNum }}>{r.indianStudent || <span style={{ color: 'var(--text-muted)' }}>0</span>}</td>
                          <td style={{ ...tdNum }}>{r.foreignCitizen || <span style={{ color: 'var(--text-muted)' }}>0</span>}</td>
                          <td style={{ ...tdNum, fontWeight: 700, color: '#1A7A6E' }}>{r.totalVisitors}</td>
                          <td style={{ ...tdBase }}><span style={{ fontSize: 11, color: 'var(--text-mid)' }}>{r.vehicleName}</span></td>

                          {/* ── Add-On ── */}
                          <td style={{ ...tdNum }}>{r.addOnCount || <span style={{ color: 'var(--text-muted)' }}>0</span>}</td>
                          <td style={{ ...tdNum }}>{r.addOnSum > 0 ? `₹${r.addOnSum.toLocaleString('en-IN')}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>

                          {/* ── Booking status ── */}
                          <td style={{ ...tdBase, textAlign: 'center' }}>
                            <span className="rounded-full px-2 py-0.5 font-semibold" style={{ fontSize: 9, ...modeSt }}>{r.bookingMode}</span>
                          </td>
                          <td style={{ ...tdBase, textAlign: 'center' }}>
                            <span className="rounded-full px-2 py-0.5 font-semibold" style={{ fontSize: 9, ...txnSt }}>{r.transactionStatus}</span>
                          </td>

                          {/* ── Field Ops ── */}
                          <td style={{ ...tdBase }}><span style={{ fontSize: 10, fontFamily: 'monospace', color: r.vehicleNumber === '—' ? 'var(--text-muted)' : 'var(--text-dark)' }}>{r.vehicleNumber}</span></td>
                          <td style={{ ...tdBase }}><span style={{ fontSize: 11, color: r.guideName === '—' ? 'var(--text-muted)' : 'var(--text-dark)' }}>{r.guideName}</span></td>
                          <td style={{ ...tdBase }}>
                            <span className="rounded-full px-2 py-0.5 font-medium" style={{ fontSize: 9, background: r.boardingPassStatus === 'Confirmed' ? 'rgba(26,122,110,0.1)' : 'rgba(154,122,90,0.1)', color: r.boardingPassStatus === 'Confirmed' ? '#1A7A6E' : '#9A7A5A' }}>
                              {r.boardingPassStatus}
                            </span>
                          </td>
                          <td style={{ ...tdBase }}><span style={{ fontSize: 10, color: r.checkIn === '—' ? 'var(--text-muted)' : 'var(--text-dark)' }}>{r.checkIn}</span></td>

                          {/* ── Session ── */}
                          <td style={{ ...tdBase }}><span style={{ fontSize: 10 }}>{r.ssoId}</span></td>
                          <td style={{ ...tdBase }}><span style={{ fontSize: 10, color: 'var(--text-mid)' }}>{r.createdBy}</span></td>
                          <td style={{ ...tdBase }}><span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{r.ipAddress}</span></td>
                          <td style={{ ...tdBase }}><span style={{ fontSize: 10, color: 'var(--text-mid)' }}>{r.device}</span></td>

                          {/* ── Verification ── */}
                          <td style={{ ...tdBase }}><VerifyChip val={r.driverVerify} /></td>
                          <td style={{ ...tdBase }}><VerifyChip val={r.guideVerify} /></td>
                          <td style={{ ...tdBase }}><VerifyChip val={r.paymentVerify} /></td>
                          <td style={{ ...tdBase }}><span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{r.driverVerifyTime}</span></td>
                          <td style={{ ...tdBase, borderRight: 'none' }}><span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{r.guideVerifyTime}</span></td>
                        </tr>

                        {/* Expanded detail panel */}
                        {isExpanded && <ExpandedRow key={r.bookingId + '-exp'} row={r} />}
                            </React.Fragment>

                      
                    )
                  })
                )}

                {/* Totals row */}
                {paged.length > 0 && (
                  <tr style={{ background: 'var(--cream-dark)', borderTop: '2px solid var(--sand)' }}>
                    <td colSpan={2} style={{ ...tdBase, position: 'sticky', left: 0, zIndex: 2, background: 'var(--cream-dark)', borderRight: '2px solid var(--sand)' }} />
                    <td colSpan={9} style={{ ...tdBase, fontWeight: 700, fontSize: 11, color: 'var(--maroon)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Page Total — {paged.length} records
                    </td>
                    <td style={{ ...tdNum, fontWeight: 700, fontSize: 13, color: 'var(--maroon)' }}>
                      ₹{paged.reduce((s,r)=>s+r.totalAmount,0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ ...tdNum }}> ₹{paged.reduce((s,r)=>s+r.choiceAddOnAmount,0).toLocaleString('en-IN')}</td>
                    <td colSpan={2} style={{ ...tdBase }} />
                    <td colSpan={3} style={{ ...tdBase }} />
                    <td style={{ ...tdNum, fontWeight: 700, color: '#1A7A6E' }}>{paged.reduce((s,r)=>s+r.totalVisitors,0)}</td>
                    <td colSpan={20} style={{ ...tdBase }} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid var(--sand)', background: 'var(--cream)' }}>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Display Data:</span>
              <div className="relative">
                <select value={String(pageSize)} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                  className="appearance-none rounded-lg pl-2.5 pr-6 py-1 outline-none"
                  style={{ fontSize: 11, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-dark)' }}>
                  {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div className="flex items-center gap-1">
              <PageBtn onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} icon={<><ChevronLeft size={12}/><span style={{fontSize:11}}>Previous</span></>} />
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p = i + 1
                if (totalPages > 5) {
                  if      (page <= 3)              p = i + 1
                  else if (page >= totalPages - 2) p = totalPages - 4 + i
                  else                             p = page - 2 + i
                }
                return <PageBtn key={p} onClick={() => setPage(p)} active={page === p} label={String(p)} />
              })}
              {totalPages > 5 && page < totalPages - 2 && <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '0 4px' }}>…</span>}
              {totalPages > 5 && <PageBtn onClick={() => setPage(totalPages)} active={page === totalPages} label={String(totalPages)} />}
              <PageBtn onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages} icon={<><span style={{fontSize:11}}>Next</span><ChevronRight size={12}/></>} />
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Result: <strong style={{ color: 'var(--text-dark)' }}>
                {totalRecords === 0 ? 0 : `${firstResult}–${lastResult}`}
              </strong> of <strong style={{ color: 'var(--maroon)' }}>{totalRecords}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
