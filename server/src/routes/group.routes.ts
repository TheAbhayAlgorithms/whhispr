import { Router } from 'express';
import { GroupController } from '../controllers/group.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';
import {
  createGroupSchema,
  createChannelSchema,
  updateGroupSchema,
  addMembersSchema,
  changeMemberRoleSchema,
  memberParamSchema,
  chatParamSchema,
  searchPublicChannelsSchema,
} from '../validation/group.schema';

const router = Router();

router.use(authenticate);

// 1. Group & Channel Creation
router.post(
  '/',
  validate(createGroupSchema),
  asyncHandler((req, res) => GroupController.createGroup(req, res)),
);
router.post(
  '/channels',
  validate(createChannelSchema),
  asyncHandler((req, res) => GroupController.createChannel(req, res)),
);

// 2. Public Channels Discovery & Joining
router.get(
  '/channels/public',
  validate(searchPublicChannelsSchema),
  asyncHandler((req, res) => GroupController.browsePublicChannels(req, res)),
);
router.post(
  '/channels/:chatId/join',
  validate(chatParamSchema),
  asyncHandler((req, res) => GroupController.joinPublicChannel(req, res)),
);

// 3. Conversation Details & Metadata Updates
router.get(
  '/:chatId/details',
  validate(chatParamSchema),
  asyncHandler((req, res) => GroupController.getChatDetails(req, res)),
);
router.patch(
  '/:chatId',
  validate(updateGroupSchema),
  asyncHandler((req, res) => GroupController.updateChat(req, res)),
);

// 4. Member Management
router.post(
  '/:chatId/members',
  validate(addMembersSchema),
  asyncHandler((req, res) => GroupController.addMembers(req, res)),
);
router.delete(
  '/:chatId/members/:targetUserId',
  validate(memberParamSchema),
  asyncHandler((req, res) => GroupController.removeMember(req, res)),
);
router.patch(
  '/:chatId/members/:targetUserId/role',
  validate(changeMemberRoleSchema),
  asyncHandler((req, res) => GroupController.updateMemberRole(req, res)),
);

// 5. Leave Conversation
router.post(
  '/:chatId/leave',
  validate(chatParamSchema),
  asyncHandler((req, res) => GroupController.leaveChat(req, res)),
);

export default router;
