import type { Request, Response, NextFunction } from 'express';
import * as emailService from '../services/email.service';

export const broadcastEmail = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { subject, body, onlyWithoutPush } = req.body as { subject: string; body: string; onlyWithoutPush?: boolean };
    const result = await emailService.broadcastEmail({ subject, body }, !!onlyWithoutPush);
    res.json({ data: result });
  } catch (err) {
    const msg = (err as Error).message || 'שגיאה לא ידועה';
    res.status(500).json({ error: { message: `שליחת מייל נכשלה: ${msg}` } });
  }
};

export const sendEmailToUser = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { userId, subject, body } = req.body as { userId: string; subject: string; body: string };
    const result = await emailService.sendEmailToUser(userId, { subject, body });
    res.json({ data: result });
  } catch (err) {
    const msg = (err as Error).message || 'שגיאה לא ידועה';
    res.status(500).json({ error: { message: `שליחת מייל נכשלה: ${msg}` } });
  }
};

export const getEmailStatus = (_req: Request, res: Response): void => {
  // כולל missing[] - אילו משתני env חסרים בדיוק (לאבחון: "למה לא מוגדר?")
  res.json({ data: emailService.emailConfigStatus() });
};
