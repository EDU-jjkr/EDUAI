import express from 'express'
import {
    getClasses,
    getSubjects,
    getChapters,
    getTopics,
    getFullCurriculum
} from '../controllers/curriculum.controller'
import { authenticate } from '../middleware/auth'

const router = express.Router()

// Public routes (or protected if needed - assuming teachers need login)
router.use(authenticate)

router.get('/', getFullCurriculum)
router.get('/classes', getClasses)
router.get('/:classNum/subjects', getSubjects)
router.get('/:classNum/:subject/chapters', getChapters)
router.get('/:classNum/:subject/:chapter/topics', getTopics)

export default router
