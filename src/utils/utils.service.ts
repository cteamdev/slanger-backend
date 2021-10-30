import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { MessageEventContext } from 'vk-io';
import { Repository } from 'typeorm';

import { AdminMessage, HelpersService } from '@/common/helpers/helpers.service';
import { Rights } from '@/common/types/rights.types';
import { User } from '@/users/entities/user.entity';
import { Slang } from '@/slangs/entities/slang.entity';
import { AdminService } from '@/admin/admin.service';

@Injectable()
export class UtilsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly helpersService: HelpersService,
    private readonly adminService: AdminService,
    @InjectRepository(User) private readonly usersRepository: Repository<User>
  ) {
    this.helpersService.groupVK.updates.on(
      'message_event',
      this.onMessageEvent.bind(this)
    );
  }

  async callback(payload: Record<string, any>): Promise<string | undefined> {
    if (payload.secret !== this.configService.get('GROUP_CALLBACK_SECRET'))
      return;
    if (payload.type === 'confirmation')
      return this.configService.get('GROUP_CALLBACK_CONFIRM');

    await this.helpersService.groupVK.updates.handleWebhookUpdate(payload);

    return 'ok';
  }

  async onMessageEvent(context: MessageEventContext): Promise<void> {
    const { userId, eventId, peerId, conversationMessageId, eventPayload } =
      context;

    const sendSnackbar = (text: string): Promise<void> =>
      this.helpersService.groupVK.api.messages
        .sendMessageEventAnswer({
          event_id: eventId,
          user_id: userId,
          peer_id: peerId,
          event_data: JSON.stringify({
            type: 'show_snackbar',
            text
          })
        })
        .then(() => void 0);

    const user: User | undefined = await this.usersRepository.findOne({
      id: userId
    });
    if (!user || ![Rights.MODERATOR, Rights.ADMIN].includes(user.rights))
      return sendSnackbar('Недостаточно прав');

    const { slangId, action } = eventPayload;
    if (!slangId || !action) return sendSnackbar('Не найдено');

    const slang: Slang | undefined = await this.adminService
      .setSlangStatus({
        id: slangId,
        status: action
      })
      .catch(() => void 0);
    if (!slang) return sendSnackbar('Не найдено');

    const { text, params }: AdminMessage =
      await this.helpersService.getAdminMessage(slang);

    await this.helpersService.editAdminMessage(
      conversationMessageId,
      text,
      params
    );

    return sendSnackbar('Успех');
  }
}
