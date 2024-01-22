import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { Collection, Connection } from 'mongoose';
import { MEDIA_FILE } from '../../constants';
import { UploadFileDto, UploadLinkDto } from './dto';

@Injectable()
export class TreatmentService {
  private readonly treatmentCollection: Collection;
  constructor(@InjectConnection() private connection: Connection) {
    this.treatmentCollection = this.connection.collection('treatment');
  }

  async getAll() {
    const data = await this.treatmentCollection
      .find<Record<string, unknown>[]>({ deletedBy: null })
      .sort({ createdAt: -1 })
      .toArray();
    return { data };
  }

  async getOne(id: string) {
    return await this.treatmentCollection.findOne<any>({ _id: new ObjectId(id) });
  }

  async clean() {
    await this.treatmentCollection.deleteMany({});
    return { status: true };
  }

  async uploadLink(userId: string, body: UploadLinkDto) {
    const { title, description, category, link } = body;
    await this.treatmentCollection.insertOne({
      title,
      description,
      link,
      category: category && category != 'undefined' ? new ObjectId(category) : null,
      createdBy: new ObjectId(userId),
      createdAt: new Date(),
      type: MEDIA_FILE.VIDEO
    });
    return { status: true };
  }

  async uploadAudio(userId: string, file: string, body: UploadFileDto) {
    const { title, description, duration, category } = body;
    await this.treatmentCollection.insertOne({
      title,
      description,
      file,
      duration: duration && duration != 'undefined' ? Number(duration) : 0,
      category: category && category != 'undefined' ? new ObjectId(category) : null,
      createdBy: new ObjectId(userId),
      createdAt: new Date(),
      type: MEDIA_FILE.AUDIO
    });
    return { status: true };
  }

  async uploadVideo(userId: string, file: string, body: UploadFileDto) {
    const { title, description, duration, category } = body;
    await this.treatmentCollection.insertOne({
      title,
      description,
      file,
      duration: duration && duration != 'undefined' ? Number(duration) : 0,
      category: category && category != 'undefined' ? new ObjectId(category) : null,
      createdBy: new ObjectId(userId),
      createdAt: new Date(),
      type: MEDIA_FILE.VIDEO
    });
    return { status: true };
  }

  async deleteOne(uId: string, id: string) {
    const d = await this.treatmentCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { deletedBy: new ObjectId(uId), deletedAt: new Date() } }
    );
    console.log(d);
    return { status: true };
  }
}
