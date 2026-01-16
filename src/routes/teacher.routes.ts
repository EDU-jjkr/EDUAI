import { Router } from 'express'
import { body } from 'express-validator'
import { authenticate, authorize, requireSchool } from '../middleware/auth'
import * as teacherController from '../controllers/teacher.controller'

const router = Router()

// All routes require teacher authentication
router.use(authenticate)
router.use(authorize('teacher', 'admin'))
// Note: School context not required for personal teacher tools like deck generation

// Deck Generation - Support both new (topics array) and legacy (single topic) formats
router.post(
  '/deck/generate',
  [
    body('topics').optional().isArray({ min: 1 }).withMessage('Topics must be an array with at least one item'),
    body('topic').optional().isString().trim().withMessage('Topic must be a non-empty string'),
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('gradeLevel').trim().notEmpty().withMessage('Grade level is required'),
    body('chapter').optional().trim(),
    // Custom validation to ensure at least one of topics or topic exists
    body().custom((value, { req }) => {
      if (!req.body.topics && !req.body.topic) {
        throw new Error('Either topics array or topic is required')
      }
      return true
    })
  ],
  teacherController.generateDeck
)

router.get('/decks', teacherController.getDecks)
router.get('/deck/:id', teacherController.getDeckById)
router.put('/deck/:id', teacherController.updateDeck)
router.delete('/deck/:id', teacherController.deleteDeck)

// Activity Generation
router.post(
  '/activity/generate',
  [
    body('topic').trim().notEmpty(),
    body('subject').trim().notEmpty(),
    body('duration').isInt({ min: 5 }),
    body('activityType').trim().notEmpty(),
    body('gradeLevel').trim().notEmpty(),
  ],
  teacherController.generateActivity
)

router.get('/activities', teacherController.getActivities)
router.get('/activity/:id', teacherController.getActivityById)
router.put('/activity/:id', teacherController.updateActivity)
router.delete('/activity/:id', teacherController.deleteActivity)

// Lesson Plan Generation
router.post(
  '/lesson-plan/generate',
  [
    body('topics').isArray({ min: 1 }),
    body('subject').trim().notEmpty(),
    body('gradeLevel').trim().notEmpty(),
    body('totalDuration').isInt({ min: 30 }),
  ],
  teacherController.generateLessonPlan
)

// Curriculum Plan Generation (auto-fetch topics from curriculum)
router.post(
  '/curriculum-plan/generate',
  [
    body('gradeLevel').trim().notEmpty(),
    body('subject').trim().notEmpty(),
  ],
  teacherController.generateCurriculumPlan
)

router.get('/lesson-plans', teacherController.getLessonPlans)
router.get('/lesson-plan/:id', teacherController.getLessonPlanById)
router.delete('/lesson-plan/:id', teacherController.deleteLessonPlan)
router.post('/lesson-plan/:id/ai-update', teacherController.updateLessonPlanWithAI)

// Question Sets (saved question papers)
router.get('/question-sets', teacherController.getQuestionSets)
router.get('/question-set/:id', teacherController.getQuestionSetById)
router.delete('/question-set/:id', teacherController.deleteQuestionSet)

// Update Deck AI
router.post('/deck/:id/ai-update', teacherController.updateDeckWithAI)

// Concept Library
router.get('/concept-library', teacherController.getConceptLibrary)
router.get('/concept/:id', teacherController.getConceptById)
router.post('/concept/search', teacherController.searchConcepts)

// Topic Generation (Replica of Deck Generation)
router.post(
  '/topic/generate',
  [
    body('topic').trim().notEmpty(),
    body('subject').trim().notEmpty(),
    body('gradeLevel').trim().notEmpty(),
    body('numSlides').optional().isInt({ min: 5, max: 20 }),
  ],
  teacherController.generateTopic
)

router.get('/topics', teacherController.getTopics)
router.get('/topic/:id', teacherController.getTopicById)
router.put('/topic/:id', teacherController.updateTopic)
router.delete('/topic/:id', teacherController.deleteTopic)
router.post('/topic/:id/ai-update', teacherController.updateTopicWithAI)

export default router
