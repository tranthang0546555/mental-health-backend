import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { Collection, Connection } from 'mongoose';

@Injectable()
export class NotificationService {
  private readonly notificationCollection = Collection;
  constructor(@InjectConnection() private connection: Connection) {
    this.notificationCollection = this.connection.collection('notifications');
  }

  async getNotifications(id: string) {
    const res = await this.notificationCollection
      .find<any>({ receiver: new ObjectId(id) })
      .limit(20)
      .sort({ createdAt: -1 })
      .toArray();
    return { data: res };
  }

  async readNotifications(id: string) {
    await this.notificationCollection.findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { isRead: true } });
    return { status: true };
  }
}
