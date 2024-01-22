import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Collection, Connection, FilterQuery } from 'mongoose';
import { UserRequestDto } from './dto';
import { getPagination } from '../../utils/pagination';
import { searchKeyword } from '../../utils/searchKeyword';
import { Role } from '../../constants';
import { ObjectId } from 'mongodb';

@Injectable()
export class UserService {
  private readonly userCollection: Collection;
  constructor(@InjectConnection() private connection: Connection) {
    this.userCollection = this.connection.collection('users');
  }

  async getAll(query: UserRequestDto) {
    const { page: numPage, size = 1000, keyword } = query;
    const { page, skip, take } = getPagination(numPage, size);
    const filter: FilterQuery<unknown> = {};
    if (keyword) filter.title = searchKeyword(keyword);
    // filter.role = { $in: [Role.DOCTOR, Role.USER] };
    filter.lock = {
      $ne: true
    };
    const sortData: FilterQuery<unknown> = {
      createdAt: -1,
      role: -1
    };

    const [totalRecords, data] = await Promise.all([
      this.userCollection.count(filter),
      this.userCollection.find<any>(filter).sort(sortData).skip(skip).limit(take).toArray()
    ]);

    return { data, totalRecords, page, size: take };
  }

  async lockUserAccount(uId: string, adId: string, message: string) {
    const userId = new ObjectId(uId);
    const adminId = new ObjectId(adId);

    await this.userCollection.findOneAndUpdate(
      { _id: userId },
      { $set: { lock: true, lockedBy: adminId, lockedAt: new Date(), message } }
    );
    return { status: true };
  }

  async getLockedUsers(query: UserRequestDto) {
    const { page: numPage, size = 1000, keyword } = query;
    const { page, skip, take } = getPagination(numPage, size);
    const filter: FilterQuery<unknown> = {};
    if (keyword) filter.title = searchKeyword(keyword);
    // filter.role = { $in: [Role.DOCTOR, Role.USER] };
    filter.lock = true;
    const sortData: FilterQuery<unknown> = {
      lockedAt: -1
    };

    const [totalRecords, data] = await Promise.all([
      this.userCollection.count(filter),
      //   this.userCollection.find<any>(filter).sort(sortData).skip(skip).limit(take).toArray()
      this.userCollection
        .aggregate([
          { $match: filter },
          {
            $lookup: {
              from: 'users',
              localField: 'lockedBy',
              foreignField: '_id',
              as: 'lockedBy',
              pipeline: [{ $project: { name: 1, email: 1 } }]
            }
          },
          { $unwind: '$lockedBy' }
        ])
        .sort(sortData)
        .skip(skip)
        .limit(take)
        .toArray()
    ]);

    return { data, totalRecords, page, size: take };
  }

  async unlockUserAccount(uId: string, adId: string) {
    const userId = new ObjectId(uId);
    const adminId = new ObjectId(adId);

    await this.userCollection.findOneAndUpdate(
      { _id: userId },
      { $set: { lock: false, lockedBy: null, lockedAt: null, unlockedBy: adminId, unlockedAt: new Date() } }
    );
    return { status: true };
  }

  async setRoleAccount(uId: string, adId: string, role: string) {
    const userId = new ObjectId(uId);
    const adminId = new ObjectId(adId);

    await this.userCollection.findOneAndUpdate({ _id: userId }, { $set: { role: role } });
    return { status: true };
  }
}
