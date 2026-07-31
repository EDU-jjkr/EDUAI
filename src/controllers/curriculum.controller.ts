import { Request, Response, NextFunction } from 'express'
import {
    getCurriculumByClass,
    getAllClasses,
    getSubjectsByClass,
    getChaptersBySubject,
    getTopicsByChapter,
    getCurriculumsByBoard,
    CURRICULUM_DATA
} from '../services/curriculum'
import { AppError } from '../middleware/error-handler'

export const getClasses = (req: Request, res: Response, next: NextFunction) => {
    try {
        const board = req.query.board as string | undefined
        const classes = getAllClasses(board)
        res.json(classes)
    } catch (error) {
        next(error)
    }
}

export const getSubjects = (req: Request, res: Response, next: NextFunction) => {
    try {
        const classNum = parseInt(req.params.classNum)
        if (isNaN(classNum)) {
            throw new AppError('Invalid class number', 400, 'INVALID_INPUT')
        }

        const board = req.query.board as string | undefined
        const subjects = getSubjectsByClass(classNum, board)
        res.json(subjects)
    } catch (error) {
        next(error)
    }
}

export const getChapters = (req: Request, res: Response, next: NextFunction) => {
    try {
        const classNum = parseInt(req.params.classNum)
        const { subject } = req.params

        if (isNaN(classNum)) {
            throw new AppError('Invalid class number', 400, 'INVALID_INPUT')
        }

        const board = req.query.board as string | undefined
        const chapters = getChaptersBySubject(classNum, subject, board)
        res.json(chapters)
    } catch (error) {
        next(error)
    }
}

export const getTopics = (req: Request, res: Response, next: NextFunction) => {
    try {
        const classNum = parseInt(req.params.classNum)
        const { subject, chapter } = req.params

        if (isNaN(classNum)) {
            throw new AppError('Invalid class number', 400, 'INVALID_INPUT')
        }

        const board = req.query.board as string | undefined
        const topics = getTopicsByChapter(classNum, subject, chapter, board)
        res.json(topics)
    } catch (error) {
        next(error)
    }
}

export const getFullCurriculum = (req: Request, res: Response, next: NextFunction) => {
    try {
        const board = req.query.board as string | undefined
        const data = board ? getCurriculumsByBoard(board) : CURRICULUM_DATA
        res.json(data)
    } catch (error) {
        next(error)
    }
}
