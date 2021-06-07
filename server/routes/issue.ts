import { Router } from 'express';
import { FindOneOptions, getRepository } from 'typeorm';
import { IssueStatus } from '../constants/issue';
import Issue from '../entity/Issue';
import IssueComment from '../entity/IssueComment';
import Media from '../entity/Media';
import { IssueResultsResponse } from '../interfaces/api/issueInterfaces';
import { Permission } from '../lib/permissions';
import logger from '../logger';
import { isAuthenticated } from '../middleware/auth';

const issueRoutes = Router();

issueRoutes.get<Record<string, string>, IssueResultsResponse>(
  '/',
  isAuthenticated(
    [
      Permission.MANAGE_ISSUES,
      Permission.VIEW_ISSUES,
      Permission.CREATE_ISSUES,
    ],
    { type: 'or' }
  ),
  async (req, res, next) => {
    // Satisfy typescript here. User is set, we assure you!
    if (!req.user) {
      return next({ status: 500, message: 'User missing from request.' });
    }

    const pageSize = req.query.take ? Number(req.query.take) : 10;
    const skip = req.query.skip ? Number(req.query.skip) : 0;

    let order: FindOneOptions<Issue>['order'];

    switch (req.query.sort) {
      case 'modified':
        order = { updatedAt: 'DESC' };
        break;
      default:
        order = { createdAt: 'DESC' };
    }

    const issueRepository = getRepository(Issue);

    const [issues, issueCount] = await issueRepository.findAndCount({
      order,
      skip,
      take: pageSize,
    });

    return res.status(200).json({
      pageInfo: {
        pages: Math.ceil(issueCount / pageSize),
        pageSize,
        results: issueCount,
        page: Math.ceil(skip / pageSize) + 1,
      },
      results: issues,
    });
  }
);

issueRoutes.post<
  Record<string, string>,
  Issue,
  {
    message: string;
    mediaId: number;
    issueType: number;
    problemSeason: number;
    problemEpisode: number;
  }
>(
  '/',
  isAuthenticated([Permission.MANAGE_ISSUES, Permission.CREATE_ISSUES], {
    type: 'or',
  }),
  async (req, res, next) => {
    // Satisfy typescript here. User is set, we assure you!
    if (!req.user) {
      return next({ status: 500, message: 'User missing from request.' });
    }

    const issueRepository = getRepository(Issue);
    const mediaRepository = getRepository(Media);

    const media = await mediaRepository.findOne({
      where: { id: req.body.mediaId },
    });

    if (!media) {
      return next({ status: 404, message: 'Media does not exist.' });
    }

    const issue = new Issue({
      createdBy: req.user,
      issueType: req.body.issueType,
      problemSeason: req.body.problemSeason,
      problemEpisode: req.body.problemEpisode,
      media,
      comments: [
        new IssueComment({
          user: req.user,
          message: req.body.message,
        }),
      ],
    });

    const newIssue = await issueRepository.save(issue);

    return res.status(200).json(newIssue);
  }
);

issueRoutes.get<{ issueId: string }>(
  '/:issueId',
  isAuthenticated(
    [
      Permission.MANAGE_ISSUES,
      Permission.VIEW_ISSUES,
      Permission.CREATE_ISSUES,
    ],
    { type: 'or' }
  ),
  async (req, res, next) => {
    const issueRepository = getRepository(Issue);
    // Satisfy typescript here. User is set, we assure you!
    if (!req.user) {
      return next({ status: 500, message: 'User missing from request.' });
    }

    try {
      const issue = await issueRepository
        .createQueryBuilder('issue')
        .leftJoinAndSelect('issue.comments', 'comments')
        .leftJoinAndSelect('issue.createdBy', 'createdBy')
        .leftJoinAndSelect('comments.user', 'user')
        .leftJoinAndSelect('issue.media', 'media')
        .where('issue.id = :issueId', { issueId: Number(req.params.issueId) })
        .getOneOrFail();

      if (
        issue.createdBy.id !== req.user.id &&
        !req.user.hasPermission(
          [Permission.MANAGE_ISSUES, Permission.VIEW_ISSUES],
          { type: 'or' }
        )
      ) {
        return next({
          status: 403,
          message: 'You do not have permission to view this issue.',
        });
      }

      return res.status(200).json(issue);
    } catch (e) {
      logger.debug('Failed to retrieve issue.', {
        label: 'API',
        errorMessage: e.message,
      });
      next({ status: 500, message: 'Issue not found.' });
    }
  }
);

issueRoutes.post<{ issueId: string }, Issue, { message: string }>(
  '/:issueId/comment',
  isAuthenticated([Permission.MANAGE_ISSUES, Permission.CREATE_ISSUES], {
    type: 'or',
  }),
  async (req, res, next) => {
    const issueRepository = getRepository(Issue);
    // Satisfy typescript here. User is set, we assure you!
    if (!req.user) {
      return next({ status: 500, message: 'User missing from request.' });
    }

    try {
      const issue = await issueRepository.findOneOrFail({
        where: { id: Number(req.params.issueId) },
      });

      if (
        issue.createdBy.id !== req.user.id &&
        !req.user.hasPermission(Permission.MANAGE_ISSUES)
      ) {
        return next({
          status: 403,
          message: 'You do not have permission to comment on this issue.',
        });
      }

      const comment = new IssueComment({
        message: req.body.message,
        user: req.user,
      });

      issue.comments = [...issue.comments, comment];

      await issueRepository.save(issue);

      return res.status(200).json(issue);
    } catch (e) {
      logger.debug('Something went wrong creating an issue comment.', {
        label: 'API',
        errorMessage: e.message,
      });
      next({ status: 500, message: 'Issue not found.' });
    }
  }
);

issueRoutes.post<{ issueId: string; status: string }, Issue>(
  '/:issueId/:status',
  isAuthenticated(Permission.MANAGE_ISSUES),
  async (req, res, next) => {
    const issueRepository = getRepository(Issue);
    // Satisfy typescript here. User is set, we assure you!
    if (!req.user) {
      return next({ status: 500, message: 'User missing from request.' });
    }

    try {
      const issue = await issueRepository.findOneOrFail({
        where: { id: Number(req.params.issueId) },
      });

      let newStatus: IssueStatus | undefined;

      switch (req.params.status) {
        case 'resolved':
          newStatus = IssueStatus.RESOLVED;
          break;
        case 'open':
          newStatus = IssueStatus.OPEN;
      }

      if (!newStatus) {
        return next({
          status: 400,
          message: 'You must provide a valid status',
        });
      }

      issue.status = newStatus;

      await issueRepository.save(issue);

      return res.status(200).json(issue);
    } catch (e) {
      logger.debug('Something went wrong creating an issue comment.', {
        label: 'API',
        errorMessage: e.message,
      });
      next({ status: 500, message: 'Issue not found.' });
    }
  }
);

export default issueRoutes;
