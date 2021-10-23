import { Slang } from '@/slangs/entities/slang.entity';
import { SlangStatus } from '@/slangs/types/slang-status.types';
import { SlangType } from '@/slangs/types/slang-type.types';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { stripIndents } from 'common-tags';
import { formatRelative } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ButtonColor, DocumentAttachment, Keyboard, VK } from 'vk-io';
import { MessagesSendUserIdsResponseItem } from 'vk-io/lib/api/schemas/objects';
import { MessagesSendParams } from 'vk-io/lib/api/schemas/params';
import {
  MessagesSendUserIdsResponse,
  NotificationsSendMessageResponse
} from 'vk-io/lib/api/schemas/responses';

export type AdminMessage = {
  text: string;
  params: Partial<MessagesSendParams>;
};

@Injectable()
export class HelpersService {
  private readonly logger: Logger = new Logger(HelpersService.name);

  public readonly appVK: VK = this.getVKInstance('APP_TOKEN');
  public readonly groupVK: VK = this.getVKInstance('GROUP_TOKEN');

  constructor(private readonly configService: ConfigService) {}

  getVKInstance(propertyPath: string): VK {
    return new VK({
      token: this.configService.get(propertyPath) || '',
      language: 'ru'
    });
  }

  getConfig(propertyPath: string): string {
    return this.configService.get(propertyPath) || '';
  }

  getUserRelations(): string[] {
    return ['bookmarks', 'bookmarks.slang', 'bookmarks.slang.user', 'settings'];
  }

  getSlangRelations(): string[] {
    return ['user'];
  }

  getBookmarkRelations(): string[] {
    return ['user', 'slang', 'slang.user'];
  }

  /**
   * Отброс разрядов числа до указанного
   * @param number число
   * @param fractionDigits количество разрядов
   */
  stripFloat(number: number, fractionDigits: number): number {
    return Number.parseFloat(number.toFixed(fractionDigits));
  }

  /**
   * Получение нужного склонения числа
   * @param amount число
   * @param forms массив форм склонения (один, два, много)
   */
  pluralize(amount: number, forms: [string, string, string]): string {
    const rule: Intl.LDMLPluralRule = new Intl.PluralRules('ru-RU').select(
      amount
    );

    const rules: Record<Intl.LDMLPluralRule, string> = {
      zero: forms[2],
      one: forms[0],
      two: forms[1],
      few: forms[1],
      many: forms[2],
      other: forms[2]
    };

    return rules[rule];
  }

  async getAdminMessage(
    slang: Slang,
    edit: boolean = false
  ): Promise<AdminMessage> {
    const format: string = formatRelative(slang.date, new Date(), {
      locale: ru
    });
    const link: string = this.getConfig('APP_URL') + '#slang?id=' + slang.id;

    const points = {
      [SlangType.WORD]: 8,
      [SlangType.COLLOCATION]: 10,
      [SlangType.PROVERB]: 12,
      [SlangType.PHRASEOLOGICAL_UNIT]: 12
    };
    const statuses = {
      [SlangStatus.MODERATING]: 'на модерации',
      [SlangStatus.DECLINED]: 'отклонён модерацией',
      [SlangStatus.PUBLIC]:
        'опубликован, вам ' +
        this.pluralize(points[slang.type], [
          'начислен',
          'начислено',
          'начислено'
        ]) +
        ' ' +
        points[slang.type] +
        ' ' +
        this.pluralize(points[slang.type], ['балл', 'балла', 'баллов'])
    };

    const upload: DocumentAttachment | undefined = await this.uploadCover(
      slang.cover
    );

    return {
      text: stripIndents`
        ${
          slang.status === SlangStatus.MODERATING
            ? `📩 Новый слэнг на модерации ${edit ? '(ред.)' : ''}`
            : `
                📩 Слэнг прошёл модерацию ${edit ? '(ред.)' : ''}
                🤨 Статус: ${statuses[slang.status]}
              `
        }

        🔢 ID: ${slang.id}
        ${slang.user ? `🧐 Автор: @id${slang.user.id}` : ''}
        ⏰ Дата: ${format} по МСК

        📌 Слово: ${slang.word}
        🎬 Тип: ${slang.type}
        😇 Темы: ${slang.themes.join(', ')}
        📖 Краткое описание: ${slang.description}

        📎 Ссылка на модерацию: ${link}
      `,
      params: {
        attachment: upload?.toString(),
        keyboard: Keyboard.builder()
          .inline()
          .callbackButton({
            label: 'Отклонить',
            color: ButtonColor.NEGATIVE,
            payload: { action: 'declined', slangId: slang.id }
          })
          .callbackButton({
            label: 'Одобрить',
            color: ButtonColor.POSITIVE,
            payload: { action: 'public', slangId: slang.id }
          })
      }
    };
  }

  async sendMessage(
    peerId: number,
    message: string,
    other: MessagesSendParams = {}
  ): Promise<MessagesSendUserIdsResponseItem> {
    // В vk-io неверные типы
    return (
      this.groupVK.api.messages.send({
        peer_ids: [peerId],
        random_id: 0,
        message,
        ...other
      }) as unknown as Promise<MessagesSendUserIdsResponse>
    ).then((data: MessagesSendUserIdsResponse) => data[0]);
  }

  async sendAdminMessage(
    message: string,
    other: MessagesSendParams = {}
  ): Promise<MessagesSendUserIdsResponseItem> {
    return this.sendMessage(
      +this.configService.get('ADMIN_PEER_ID'),
      message,
      other
    );
  }

  async editAdminMessage(
    conversation_message_id: number,
    message: string,
    other: MessagesSendParams = {}
  ): Promise<number> {
    return this.groupVK.api.messages.edit({
      peer_id: +this.configService.get('ADMIN_PEER_ID'),
      conversation_message_id,
      message,
      ...other
    });
  }

  async uploadCover(
    cover: string | undefined
  ): Promise<DocumentAttachment | undefined> {
    if (!cover) return;
    if (!cover.startsWith('https://') && !cover.startsWith('http://')) return;

    return this.groupVK.upload.messageDocument({
      peer_id: +this.configService.get('ADMIN_PEER_ID'),
      source: {
        value: cover
      }
    });
  }

  async sendNotification(
    userId: number,
    message: string,
    fragment?: string
  ): Promise<NotificationsSendMessageResponse> {
    return this.appVK.api.notifications.sendMessage({
      user_ids: userId,
      message,
      fragment
    });
  }
}
