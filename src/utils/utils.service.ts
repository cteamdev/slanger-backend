import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
  ButtonColor,
  DocumentAttachment,
  Keyboard,
  MessageEventContext
} from 'vk-io';
import { Repository } from 'typeorm';
import { stripIndents } from 'common-tags';
import { ru } from 'date-fns/locale';
import { formatRelative } from 'date-fns';

import { HelpersService } from '@/common/helpers/helpers.service';
import { Rights } from '@/common/types/rights.types';
import { User } from '@/users/entities/user.entity';
import { Slang } from '@/slangs/entities/slang.entity';
import { AdminService } from '@/admin/admin.service';
import { SlangStatus } from '@/slangs/types/slang-status.types';

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

    const slang: Slang | undefined = await this.adminService.setSlangStatus({
      id: slangId,
      status: action
    });
    if (!slang) return sendSnackbar('Не найдено');

    const statuses = {
      [SlangStatus.MODERATING]: 'на модерации',
      [SlangStatus.DECLINED]: 'отклонён модерацией',
      [SlangStatus.PUBLIC]: 'опубликован'
    };
    const format: string = formatRelative(slang.date, new Date(), {
      locale: ru
    });
    const link: string =
      this.helpersService.getConfig('APP_URL') + '#slang?id=' + slang.id;

    const upload: DocumentAttachment | undefined =
      await this.helpersService.uploadCover(slang.cover);

    await this.helpersService.editAdminMessage(
      conversationMessageId,
      stripIndents`
        📩 Слэнг прошёл модерацию
        🤨 Статус: ${statuses[slang.status]}

        🔢 ID: ${slang.id}
        🧐 Автор: @id${userId}
        ⏰ Дата: ${format} по МСК

        📌 Слово: ${slang.word}
        🎬 Тип: ${slang.type}
        📖 Краткое описание: ${slang.description}

        📎 Ссылка на модерацию: ${link}
      `,
      {
        attachment: upload?.toString(),
        keyboard: Keyboard.builder()
          .inline()
          .callbackButton({
            label: 'Отклонить',
            color: ButtonColor.NEGATIVE,
            payload: { action: 'declined', slangId }
          })
          .callbackButton({
            label: 'Одобрить',
            color: ButtonColor.POSITIVE,
            payload: { action: 'public', slangId }
          })
      }
    );

    return sendSnackbar('Успех');
  }
}
