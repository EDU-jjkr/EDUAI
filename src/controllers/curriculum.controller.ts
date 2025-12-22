import { Request, Response, NextFunction } from 'express'
import {
    getCurriculumByClass,
    getAllClasses,
    getSubjectsByClass,
    getChaptersBySubject,
    getTopicsByChapter,
    CURRICULUM_DATA
} from '../services/curriculum'
import { AppError } from '../middleware/error-handler'

export const getClasses = (req: Request, res: Response, next: NextFunction) => {
    try {
        const classes = getAllClasses()
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

        const subjects = getSubjectsByClass(classNum)
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

        const chapters = getChaptersBySubject(classNum, subject)
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

        const topics = getTopicsByChapter(classNum, subject, chapter)
        res.json(topics)
    } catch (error) {
        next(error)
    }
}

export const getFullCurriculum = (req: Request, res: Response, next: NextFunction) => {
    try {
        res.json(CURRICULUM_DATA)
    } catch (error) {
        next(error)
    }
}
