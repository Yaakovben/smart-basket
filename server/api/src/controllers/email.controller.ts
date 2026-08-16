import type { Request, Response, NextFunction } from 'express';
import * as emailService from '../services/email.service';

export const broadcastEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { subject, body, onlyWithoutPush } = req.body as { subject: string; body: string; onlyWithoutPush?: boolean };
    const result = await emailService.broadcastEmail({ subject, body }, !!onlyWithoutPush);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
};

export const sendEmailToUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, subject, body } = req.body as { userId: string; subject: string; body: string };
    const result = await emailService.sendEmailToUser(userId, { subject, body });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
};

export const getEmailStatus = (_req: Request, res: Response): void => {
  res.json({ data: { enabled: emailService.isEmailEnabled() } });
};
