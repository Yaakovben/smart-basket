import type { Response } from 'express';
import { ListService } from '../services';
import { asyncHandler } from '../utils';
import type { AuthRequest } from '../types';
import type { CreateListInput, UpdateListInput, JoinGroupInput } from '../validators';

export class ListController {
  static getLists = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const lists = await ListService.getUserLists(userId);

    res.json({
      success: true,
      data: lists,
    });
  });

  static getList = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    const list = await ListService.getList(id, userId);

    res.json({
      success: true,
      data: list,
    });
  });

  static createList = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const data = req.body as CreateListInput;
    const list = await ListService.createList(userId, data);

    res.status(201).json({
      success: true,
      data: list,
    });
  });

  static updateList = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = req.body as UpdateListInput;
    const list = await ListService.updateList(id, userId, data);

    res.json({
      success: true,
      data: list,
    });
  });

  static deleteList = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    const { memberIds, listName } = await ListService.deleteList(id, userId);

    res.json({
      success: true,
      message: 'List deleted successfully',
      data: { memberIds, listName },
    });
  });

  static joinGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const data = req.body as JoinGroupInput;
    const list = await ListService.joinGroup(userId, data);

    res.json({
      success: true,
      data: list,
    });
  });

  static leaveGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    await ListService.leaveGroup(id, userId);

    res.json({
      success: true,
      message: 'Left group successfully',
    });
  });

  static removeMember = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { id, memberId } = req.params;
    const list = await ListService.removeMember(id, userId, memberId);

    res.json({
      success: true,
      data: list,
    });
  });

}
