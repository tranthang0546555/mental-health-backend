import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { Collection, Connection, FilterQuery } from 'mongoose';
import { PostType, Role } from '../../constants';
import { getPagination } from '../../utils/pagination';
import { searchKeyword } from '../../utils/searchKeyword';
import { PostRequestDto } from '../post/dto';
import { DoctorRequestDto, TimeServingCreateDto, TimeServingDeleteDto, WorkingRoomsCreateDto } from './dto';
@Injectable()
export class DoctorService {
  private readonly userCollection: Collection;
  private readonly postCollection: Collection;
  private readonly postViewCollection: Collection;
  private readonly postLikeCollection: Collection;
  private readonly postCommentCollection: Collection;
  private readonly scheduleCollection: Collection;
  constructor(@InjectConnection() private connection: Connection) {
    this.userCollection = this.connection.collection('users');
    this.postCollection = this.connection.collection('posts');
    this.postViewCollection = this.connection.collection('posts_view');
    this.postLikeCollection = this.connection.collection('posts_like');
    this.postCommentCollection = this.connection.collection('posts_comment');
    this.scheduleCollection = this.connection.collection('schedules');
  }
  async getAll(input: DoctorRequestDto) {
    const { page: numPage, size, keyword } = input;
    const { page, skip, take } = getPagination(numPage, size);
    const filter: FilterQuery<unknown> = {};
    filter.role = Role.DOCTOR;

    if (keyword)
      filter.$or = [{ 'name.lastName': searchKeyword(keyword) }, { 'name.firstName': searchKeyword(keyword) }, { 'fullName': searchKeyword(keyword) }];

    const [totalRecords, data] = await Promise.all([
      this.userCollection.count(filter),
      this.userCollection
        .aggregate([
          {
            $match: filter
          },
          {
            $project: {
              password: 0
            }
          },
          {
            $lookup: {
              from: 'schedules',
              localField: '_id',
              foreignField: 'doctorId',
              as: 'rating',
              pipeline: [
                {
                  $match: { rating: { $ne: null } }
                }
              ]
            }
          }
        ])
        .skip(skip)
        .limit(take)
        .toArray()
    ]);

    const newData = data.map((v) => {
      const sum = v?.rating?.reduce((a, b) => a + b?.rating, 0);
      const avg = sum / v?.rating?.length || 0;
      return { ...v, rating: avg, ratingCount: v?.rating?.length || 0 };
    });

    return {
      data: newData,
      totalRecords,
      size: take,
      page
    };
  }

  async getOne(id: string) {
    const data = await this.userCollection.findOne<Record<string, unknown>>(
      { _id: new ObjectId(id) },
      { projection: { password: 0 } }
    );
    if (!data) throw new BadRequestException({ message: 'Doctor not found' });
    return data;
  }

  async getPosts(query: PostRequestDto, doctorId: string, role: string) {
    const { page: numPage, size, keyword, option } = query;
    const { page, skip, take } = getPagination(numPage, size);
    const filter: FilterQuery<unknown> = {};
    if (role === Role.DOCTOR) filter.createdBy = new ObjectId(doctorId);
    filter.deletedBy = null;
    if (keyword) filter.title = searchKeyword(keyword);
    const sortData: FilterQuery<unknown> = {};

    switch (option) {
      case PostType.NEWEST:
        sortData.createdAt = -1;
        break;
      case PostType.POPULAR:
        sortData.viewCount = -1;
        break;
      case PostType.RATE:
        sortData.likeCount = -1;
        break;
      default:
        sortData._id = -1;
    }

    const [totalRecords, data] = await Promise.all([
      this.postCollection.count(filter),
      this.postCollection
        .aggregate([
          { $match: filter },
          {
            $lookup: {
              from: 'users',
              localField: 'createdBy',
              foreignField: '_id',
              as: 'createdBy',
              pipeline: [{ $project: { avatar: 1, name: 1 } }]
            }
          },
          { $unwind: '$createdBy' },
          {
            $lookup: {
              from: 'post_groups',
              localField: 'groupBy',
              foreignField: '_id',
              as: 'group'
            }
          },
          {
            $addFields: {
              groupBy: {
                $arrayElemAt: ['$group', 0]
              }
            }
          },
          {
            $lookup: {
              from: 'posts_comment',
              localField: '_id',
              foreignField: 'postId',
              as: 'comments'
            }
          },
          {
            $lookup: {
              from: 'posts_like',
              localField: '_id',
              foreignField: 'postId',
              as: 'likes'
            }
          },
          {
            $lookup: {
              from: 'posts_view',
              localField: '_id',
              foreignField: 'postId',
              as: 'views',
              pipeline: [
                {
                  $group: {
                    _id: null,
                    sum: {
                      $sum: '$viewCount'
                    }
                  }
                }
              ]
            }
          },
          {
            $addFields: {
              view: {
                $arrayElemAt: ['$views', 0]
              }
            }
          },
          {
            $project: {
              id: '$_id',
              title: 1,
              description: 1,
              createdBy: 1,
              commentCount: {
                $size: '$comments'
              },
              likeCount: {
                $size: '$likes'
              },
              groupBy: 1,
              createdAt: 1,
              updatedAt: 1,
              slug: 1,
              viewCount: '$view.sum'
            }
          }
        ])
        .sort(sortData)
        .skip(skip)
        .limit(take)
        .toArray()
    ]);
    return { data, totalRecords, page, size: take };
  }

  async getTimeServing(doctorId: string) {
    const data = await this.userCollection.findOne<Record<string, unknown>>(
      {
        _id: new ObjectId(doctorId)
      },
      {
        projection: {
          timeServing: 1
        }
      }
    );
    return data.timeServing;
  }

  async getWorkingRooms(doctorId: string) {
    const data = await this.userCollection.findOne<Record<string, unknown>>(
      {
        _id: new ObjectId(doctorId)
      },
      {
        projection: {
          workingRooms: 1
        }
      }
    );
    return data.workingRooms || { rooms: [], default: undefined };
  }
  async createWorkingRooms(doctorId: string, input: WorkingRoomsCreateDto) {
    const doctor = await this.userCollection.findOne({ _id: new ObjectId(doctorId) });
    if (!doctor) throw new BadRequestException({ message: 'Người dùng không tồn tại' });

    await this.userCollection.updateOne(
      { _id: new ObjectId(doctorId) },
      {
        $set: {
          workingRooms: input.workingRooms,
        }
      }
    );

    return { status: true };
  }

  async createTimeServing(doctorId: string, input: TimeServingCreateDto) {
    const { from, to, day, room } = input;

    const doctor = await this.userCollection.findOne({ _id: new ObjectId(doctorId) });
    if (!doctor) throw new BadRequestException({ message: 'Người dùng không tồn tại' });

    const preTimeServing = doctor?.timeServing || {};
    const newTimeServing = { ...preTimeServing };

    if (preTimeServing[day]) {
      const tempA = [...preTimeServing[day], { from, to, room }];
      const tempB = tempA.sort((a, b) => {
        if (a.from > b.from) return 1;
        if (a.from < b.from) return -1;
        return 0;
      });

      const currentIndex = tempB.findIndex((v) => v.from == from && v.to == to);
      if (tempB[currentIndex - 1])
        if (tempB[currentIndex - 1].to > tempB[currentIndex].from)
          throw new BadRequestException({ message: 'Thời gian không hợp lệ' });

      if (tempB[currentIndex + 1])
        if (tempB[currentIndex + 1].from < tempB[currentIndex].to)
          throw new BadRequestException({ message: 'Thời gian không hợp lệ' });

      newTimeServing[day] = tempB;
    } else newTimeServing[day] = [{ from, to, room }];

    await this.userCollection.updateOne(
      { _id: new ObjectId(doctorId) },
      {
        $set: {
          timeServing: newTimeServing
        }
      }
    );

    return { status: true };
  }

  async deleteTimeServing(doctorId: string, input: TimeServingDeleteDto) {
    const doctor = await this.userCollection.findOne({ _id: new ObjectId(doctorId) });
    if (!doctor) throw new BadRequestException({ message: 'Người dùng không tồn tại' });

    const timeServing = doctor?.timeServing;

    delete timeServing[input.day];

    await this.userCollection.updateOne(
      { _id: new ObjectId(doctorId) },
      {
        $set: {
          timeServing: timeServing
        }
      }
    );
  }
}
