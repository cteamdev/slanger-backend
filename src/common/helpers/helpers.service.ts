import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VK } from 'vk-io';
import { NotificationsSendMessageResponse } from 'vk-io/lib/api/schemas/responses';

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
    return [
      'slangs',
      'slangs.user',
      'slangs.votes',
      'slangs.votes.user',
      'bookmarks',
      'bookmarks.slang',
      'bookmarks.slang.user',
      'bookmarks.slang.votes',
      'bookmarks.slang.votes.user',
      'settings'
    ];
  }

  getSlangRelations(): string[] {
    return ['user', 'votes', 'votes.user'];
  }

  getBookmarkRelations(): string[] {
    return ['user', 'slang', 'slang.user', 'slang.votes', 'slang.votes.user'];
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

  async sendMessage(peerId: number, message: string): Promise<number> {
    return this.groupVK.api.messages.send({
      peer_id: peerId,
      random_id: 0,
      message
    });
  }

  async sendAdminMessage(message: string): Promise<number> {
    return this.sendMessage(+this.configService.get('ADMIN_PEER_ID'), message);
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
