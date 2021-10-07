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
    return ['slangs', 'bookmarks', 'settings'];
  }

  getSlangRelations(): string[] {
    return ['user'];
  }

  getBookmarkRelations(): string[] {
    return ['user', 'slang'];
  }

  stripFloat(number: number, fractionDigits: number): number {
    return Number.parseFloat(number.toFixed(fractionDigits));
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
