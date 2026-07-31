# 📋 Educational Platform (EDU) - Features List

This document provides a comprehensive breakdown of all features and capabilities available in the Educational Platform, organized by user role tabs (**Teacher**, **Admin**, **Student**), as well as **Super Admin** and **Core Platform Infrastructure**.

---

## 👩‍🏫 1. Teacher Tab Features

### 🎨 AI Teaching Content Generation
* **Teaching Deck / Presentation Generator** (`/api/teacher/deck/generate`)
  * AI-powered presentation slide deck creation for any topic, subject, and grade level.
  * Multi-topic batch deck generation (topics array or single topic).
  * Customizable slide count, Bloom's taxonomy levels, and visual layouts.
  * Interactive layout switching for slides (`/api/teacher/decks/switch-layout`).
  * Slide cluster regeneration (`/api/teacher/decks/regenerate-cluster`).
  * Conversational AI deck editing (`/api/teacher/deck/:id/ai-update`).
  * Complete deck library management (List, View, Edit, Delete).

* **Interactive Activity & Quiz Generator** (`/api/teacher/activity/generate`)
  * Curriculum-aligned quiz and classroom activity generator.
  * Multiple item types: Multiple Choice (4 options), True/False, and Short Answer.
  * Pedagogical difficulty progression: *Foundation Check*, *Multi-step Application*, and *Integrated Challenge*.
  * Specific distractors targeting common student misconceptions.
  * Teacher instruction custom prompt injection.
  * Full activity management (List, View, Edit, Delete).

* **AI Lesson Plan Generator** (`/api/teacher/lesson-plan/generate`)
  * Automated session-based lesson plan creation based on curriculum topics.
  * Smart attention-span duration chunking based on student grade level (Primary: 10-15m, Middle: 15-20m, Senior: 20-25m).
  * Measurable Bloom's taxonomy learning objectives.
  * Automated repair for unmeasurable verbs (*understand*, *know*, *learn about*).
  * Reflection prompts, misconception warnings, and resource suggestions.
  * Conversational AI lesson plan updating (`/api/teacher/lesson-plan/:id/ai-update`).

* **Curriculum Plan Generator** (`/api/teacher/curriculum-plan/generate`)
  * Auto-fetches topics from CBSE/State curriculum standards.
  * Generates multi-week structured instructional roadmaps.

* **Topic Generator** (`/api/teacher/topic/generate`)
  * Deep-dive topic content module generator with AI updating support.

---

### 📝 Question Generator & Test Paper Creator
* **Custom Question Generator** (`/api/questions/generate`)
  * Single-type question generator (MCQ, Fill in the blanks, Short/Long Answer, Match the following).
  * Configurable difficulty level (Easy, Medium, Hard).
* **Mixed Question Paper Generator** (`/api/questions/generate-mixed`)
  * Generates complete multi-section exam papers with mixed question types.
* **PDF Question Paper Export** (`/api/questions/generate-mixed-pdf`)
  * Professional PDF export with school header, instructions, and formatted questions.
* **PDF Answer Key Export** (`/api/questions/generate-mixed-answer-key`)
  * Separate printable Answer Key & Explanation document PDF export.
* **Saved Question Sets Management** (`/api/teacher/question-sets`)
  * Save, list, view, and delete generated question papers.

---

### 📚 Concept Library
* Browse pre-seeded educational concepts mapped to grade levels and subjects (`/api/teacher/concept-library`).
* Detailed concept views with prerequisites and related concepts (`/api/teacher/concept/:id`).
* Concept search engine (`/api/teacher/concept/search`).

---

### 📅 Class Attendance & Student Roster
* Mark daily attendance for assigned class (`/api/teacher/attendance`).
* View assigned class student roster (`/api/teacher/students`).
* View attendance records across all classes (`/api/teacher/attendance/classes`).

---

### 📖 Homework & Learning Materials
* Assign homework with due dates, subject, and class filtering (`/api/teacher/homework`).
* Update, delete, and view assigned homework submissions.
* Upload study materials (PDF, Documents, Images, Video links) (`/api/teacher/materials`).

---

### 📊 Examination & Grade Results
* Create exams (Unit Test, Mid-Term, Final Exam, Quiz, Practical) (`/api/teacher/exam`).
* Enter and manage student marks and results (`/api/teacher/result`).
* View class-wide exam results and performance analytics (`/api/teacher/results/:examId`).

---

### 📢 Announcements & Notifications
* Post class-specific or school-wide announcements (`/api/announcements`).

---

## 🏫 2. Admin Tab Features

### 👥 User Management
* **User Creation & Management** (`/api/admin/users`)
  * Create, view, update, and delete user accounts (Teachers, Students, Staff).
  * Filter by role, grade level, section, and school tenant.
* **CSV Bulk User Import** (`/api/admin/bulk-import` & `/api/admin/users/template`)
  * Download standardized CSV template for batch user onboarding.
  * Batch import students and teachers with validation and error reporting.

---

### 🏫 Class & Section Administration
* Create classes and sections (`/api/admin/classes`).
* Assign Class Teachers to specific classes and sections (`/api/admin/classes/assign-teacher`).

---

### 📊 School Attendance & Presence Dashboard
* Class-wise attendance overview summary (`/api/admin/attendance`).
* Detailed class/section/date attendance lookup (`/api/admin/attendance/:class/:section/:date`).
* Real-time Teacher presence tracking (`/api/admin/teachers/presence`).
* Student presence summary and monthly attendance analytics (`/api/admin/monthly`).

---

### 🔍 Content Oversight & Moderation
* View all teacher-generated content across the school (`/api/admin/teacher-content`).
* Delete or moderate teacher content (`/api/admin/teacher-content/:contentType/:id`).

---

### 📈 School Statistics & Analytics
* High-level platform usage statistics (`/api/admin/stats`).
* Executive analytics summary (`/api/admin/analytics/summary`).

---

## 🎓 3. Student Tab Features

### 🤖 AI Doubt Solver (Personal Tutor)
* **Text-based Doubt Solver** (`/api/student/doubt/text`)
  * Ask any academic question and receive step-by-step Socratic explanations.
* **Image-based Doubt Solver** (`/api/student/doubt/image`)
  * Upload photos/diagrams of textbook questions or handwritten math problems (OCR processing).
* **Voice-based Doubt Solver** (`/api/student/doubt/voice`)
  * Voice query doubt resolution using speech-to-text transcript processing.
* **Interactive Follow-up Discussions** (`/api/student/doubt/:id/follow-up`)
  * Ask follow-up clarifying questions in a continuous thread.
* **Similar Practice Problems** (`/api/student/doubt/:id/similar`)
  * Auto-generates practice questions similar to resolved doubts for concept reinforcement.
* **Weak Areas Identification** (`/api/student/weak-areas`)
  * Tracks frequently asked doubt topics and highlights weak concept areas.
* **Doubt History Log** (`/api/student/doubts`, `/api/student/doubt/:id`)
  * Review all past doubts, solutions, and explanations.

---

### 📚 Learning Materials & Homework
* Access teacher-uploaded study materials and notes (`/api/student/materials`).
* View pending & completed homework assignments (`/api/student/homework`).
* Submit completed homework (`/api/student/homework/:id/submit`).

---

### 📊 Academic Results & Performance
* View individual exam results, marks obtained, and subject grades (`/api/student/results`).

---

### 🔔 Notifications & Announcements
* View school and class announcements (`/api/announcements`).
* Real-time notification center with read status tracking (`/api/notifications`).

---

## 👑 4. Super Admin Features (Multi-Tenant Platform Management)

* **School Tenant Management** (`/api/super-admin/schools`)
  * Create, view, update, and suspend/activate school tenants.
  * Subdomain routing lookup (`/api/super-admin/by-subdomain/:subdomain`).
* **School Admin Onboarding** (`/api/super-admin/schools/:id/admins`)
  * Provision primary administrative accounts for new schools.
* **Self-Service School Registration** (`/api/super-admin/register`)
  * Public registration portal for new institution sign-ups.
* **Cross-Tenant User Directory** (`/api/super-admin/users`)
  * Global user directory search across all schools.
* **Platform-wide Analytics** (`/api/super-admin/stats`)
  * Global tenant count, total active users, and system usage metrics.

---

## ⚙️ 5. Technical Infrastructure & Core Capabilities

* **Authentication & Multi-Tenancy**
  * JWT Access Tokens & Refresh Tokens.
  * Multi-tenant school data isolation.
  * Role-Based Access Control (RBAC): `super_admin`, `admin`, `teacher`, `student`.
  * Password reset workflow with secure token handling (`/api/password-reset`).
* **AI Model Engine**
  * Powered by `gpt-5.6-luna` OpenAI model with full `max_completion_tokens` support.
  * Structured JSON output enforcement with automatic markdown code fence extraction.
  * Multi-threaded asynchronous FastAPI backend.
