import { InjectConnection } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Collection, Connection } from 'mongoose';
import { CategoryCreateDto } from './dto';
import { ObjectId } from 'mongodb';

@Injectable()
export class CategoryService {
  private readonly categoryCollection: Collection;
  constructor(@InjectConnection() private connect: Connection) {
    this.categoryCollection = this.connect.collection('category');
  }

  async getAll() {
    const [totalRecords, data] = await Promise.all([
      this.categoryCollection.count(),
      this.categoryCollection.aggregate().sort({ createdAt: -1 }).toArray()
    ]);

    return { data, totalRecords, page: 1, size: Infinity };
  }

  async getOne(cId: string) {
    const id = new ObjectId(cId);
    const data = this.categoryCollection.findOne<unknown>({ _id: id });
    return data;
  }

  async create(uId: string, data: CategoryCreateDto) {
    const createdBy = new ObjectId(uId);
    await this.categoryCollection.insertOne({ ...data, createdBy, createdAt: new Date() });
    return { status: true };
  }

  async edit(uId: string, cId: string, data: CategoryCreateDto) {
    const updatedBy = new ObjectId(uId);
    await this.categoryCollection.updateOne(
      { _id: new ObjectId(cId) },
      { $set: { ...data, updatedBy, updatedAt: new Date() } }
    );
    return { status: true };
  }

  async delete(id: string) {
    await this.categoryCollection.findOneAndDelete({ _id: new ObjectId(id) });
    return { status: true };
  }
}
