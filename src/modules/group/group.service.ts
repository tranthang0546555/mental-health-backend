import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Collection, Connection } from 'mongoose';

@Injectable()
export class GroupService {
  private readonly groupCollection: Collection;
  constructor(@InjectConnection() private connection: Connection) {
    this.groupCollection = this.connection.collection('groups');
  }

  async getAll() {
    const groups = await this.groupCollection.find<Record<string, unknown>[]>({}).toArray();

    return {
      data: groups
    };
  }
}
