import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import * as attendanceController from '../controllers/attendance.controller'

const router = Router()

// ============================================
// TEACHER ROUTES
// ============================================

// Get students for teacher's assigned class
router.get(
    '/teacher/students',
    authenticate,
    authorize('teacher'),
    attendanceController.getMyStudents
)

// Mark attendance
router.post(
    '/teacher/attendance',
    authenticate,
    authorize('teacher'),
    attendanceController.markAttendance
)

// Get all classes (for viewing)
router.get(
    '/teacher/attendance/classes',
    authenticate,
    authorize('teacher'),
    attendanceController.getAllClasses
)

// View attendance for any class
router.get(
    '/teacher/attendance',
    authenticate,
    authorize('teacher'),
    attendanceController.getClassAttendance
)

// ============================================
// ADMIN ROUTES
// ============================================

// Get attendance overview (class-wise summary)
router.get(
    '/admin/attendance',
    authenticate,
    authorize('admin'),
    attendanceController.getAttendanceOverview
)

// Get detailed attendance for specific class/section/date
router.get(
    '/admin/attendance/:class/:section/:date',
    authenticate,
    authorize('admin'),
    attendanceController.getDetailedAttendance
)

// Get teacher presence
router.get(
    '/admin/teachers/presence',
    authenticate,
    authorize('admin'),
    attendanceController.getTeacherPresence
)

// Get student presence summary
router.get(
    '/admin/students/presence',
    authenticate,
    authorize('admin'),
    attendanceController.getStudentPresence
)

// Get monthly attendance summary
router.get(
    '/admin/monthly',
    authenticate,
    authorize('admin'),
    attendanceController.getMonthlyAttendanceSummary
)

export default router

