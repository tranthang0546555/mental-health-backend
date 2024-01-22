import { MailerService } from '@nestjs-modules/mailer';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import * as date from 'date-and-time';
import { addDays } from 'date-and-time';
import { ObjectId } from 'mongodb';
import { Collection, Connection, FilterQuery } from 'mongoose';
import { generate } from 'randomstring';
import { NotificationType, Role, SCHEDULE_STATUS, TimeLine } from '../../constants';
import { AuthPayload, Pagination, TimeLineDto } from '../../dto';
import { getPagination } from '../../utils/pagination';
import {
  CancelScheduleDto,
  PatientRegistrationDto,
  PatientRegistrationStatusDto,
  SetDoctorScheduleDto,
  VerifyDto
} from './dto';

@Injectable()
export class ScheduleService {
  private readonly scheduleCollection: Collection;
  private readonly notificationCollection: Collection;
  private readonly userCollection: Collection;
  constructor(@InjectConnection() private connection: Connection, private readonly mailerService: MailerService) {
    this.userCollection = this.connection.collection('users');
    this.scheduleCollection = this.connection.collection('schedules');
    this.notificationCollection = this.connection.collection('notifications');
  }

  async patientRegistration(uId: string, input: PatientRegistrationDto) {
    const { doctorId, from, to } = input;
    const regisExisted = await this.scheduleCollection.findOne({
      doctorId: new ObjectId(doctorId),
      from: new Date(from),
      status: SCHEDULE_STATUS.PROGRESS
    });

    if (doctorId && regisExisted) throw new BadRequestException({ message: 'Lịch đã được ai đó đặt trước' });

    await this.scheduleCollection.insertOne({
      userId: new ObjectId(uId),
      doctorId: doctorId ? new ObjectId(doctorId) : null,
      code: generate(10),
      from: new Date(from),
      to: new Date(to),
      room: input.room,
      status: SCHEDULE_STATUS.PENDING,
      createdAt: new Date()
    });

    return { message: 'Đặt lịch hoàn tất' };
  }

  async cancelSchedule(id: string, user: AuthPayload, body: CancelScheduleDto) {
    await this.scheduleCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          canceledBy: new ObjectId(user.id),
          canceledAt: new Date(),
          message: body.message,
          status: SCHEDULE_STATUS.CANCEL
        }
      }
    );

    return { status: true };
  }

  async booked(doctorId: string) {
    const now = new Date();
    const toDay = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const currentDay = now.getDay();

    const from = addDays(toDay, 0 - currentDay);
    const to = addDays(toDay, 14 - currentDay);
    // console.log(from, to);
    const schedulesOfWeek = await this.scheduleCollection
      .find<any>({
        doctorId: new ObjectId(doctorId),
        from: { $gte: from },
        to: { $lt: to },
        status: { $in: [SCHEDULE_STATUS.PROGRESS, SCHEDULE_STATUS.PENDING] }
      })
      .toArray();

    const data = schedulesOfWeek.map((v) => v?.from);
    return data;
  }

  async getAll(uId: string, by: string, input: PatientRegistrationStatusDto) {
    const userId = new ObjectId(uId);
    const { option, page: pageNum, size } = input;
    const { page, skip, take } = getPagination(pageNum, size);

    const filter: FilterQuery<unknown> = {};
    const sortData: FilterQuery<unknown> = {};

    switch (option) {
      case SCHEDULE_STATUS.CANCEL:
        {
          filter.status = SCHEDULE_STATUS.CANCEL;
          sortData.from = -1;
        }
        break;
      case SCHEDULE_STATUS.PROGRESS:
        {
          filter.status = SCHEDULE_STATUS.PROGRESS;
          // filter.from = { $gte: new Date() };
          sortData.from = 1;
        }
        break;
      case SCHEDULE_STATUS.PENDING:
        {
          filter.status = SCHEDULE_STATUS.PENDING;
          sortData.from = 1;
        }
        break;
      case SCHEDULE_STATUS.COMPLETED:
        {
          filter.status = SCHEDULE_STATUS.COMPLETED;
          sortData.from = 1;
        }
        break;
      default: {
        filter.status = {
          $ne: SCHEDULE_STATUS.CANCEL
        };
        // filter.from = { $gte: new Date() };
        sortData.from = 1;
      }
    }

    if (by == Role.USER) filter.userId = userId;
    else filter.doctorId = userId;

    const [totalRecords, data] = await Promise.all([
      this.scheduleCollection.count(filter),
      this.scheduleCollection
        .aggregate([
          { $match: filter },
          {
            $lookup: {
              from: 'users',
              localField: 'userId',
              foreignField: '_id',
              as: 'user',
              pipeline: [{ $project: { password: 0 } }]
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'doctorId',
              foreignField: '_id',
              as: 'doctor',
              pipeline: [{ $project: { password: 0 } }]
            }
          },
          { $unwind: '$user' },
          // { $unwind: '$doctor' }
          {
            $unwind: {
              path: '$doctor',
              preserveNullAndEmptyArrays: true
            }
          }
        ])
        .skip(skip)
        .limit(take)
        .sort(sortData)
        .toArray()
    ]);

    return {
      data,
      page,
      size: take,
      totalRecords
    };
  }

  async roomAccess(uId: string, room: string, valid = false) {
    const schedule = await this.scheduleCollection.findOne({ code: room, status: SCHEDULE_STATUS.PROGRESS });

    if (!schedule) throw new BadRequestException({ message: 'Phòng khám không tồn tại hoặc đã đóng' });
    const isUser = uId === schedule.userId?.toString();
    const isDoctor = uId === schedule.doctorId?.toString();

    if (isUser || isDoctor || valid) return { status: true };

    throw new BadRequestException({ message: 'Bạn không thể vào phòng này' });
  }

  async schedulesChart(uId: string, role: string, query: TimeLineDto) {
    const now = new Date();
    const dayOnMonth = [];

    for (let i = 0; i <= TimeLine[query.timeline].day; i++) {
      dayOnMonth.unshift(date.addDays(now, -i));
    }
    const filter: FilterQuery<unknown> = {};
    if (role === Role.DOCTOR) filter.doctorId = new ObjectId(uId);
    filter.status = {
      $in: [SCHEDULE_STATUS.PROGRESS, SCHEDULE_STATUS.COMPLETED]
    };
    const schedules = await this.scheduleCollection
      .aggregate([
        {
          $match: {
            ...filter,
            from: { $gte: new Date(dayOnMonth[0]) }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$from'
              }
            },
            total: { $sum: 1 }
          }
        }
      ])
      .toArray();
    const labels = [];
    const data = [];

    dayOnMonth.forEach((v) => {
      const dayFormat = date.format(v, 'DD/MM');
      const hasValue = schedules.find((value) => {
        const day = new Date(value?._id);
        const dF = date.format(day, 'DD/MM');
        return dayFormat == dF;
      });

      if (hasValue) {
        labels.unshift(dayFormat);
        data.unshift(hasValue?.total || 0);
      } else {
        labels.unshift(dayFormat);
        data.unshift(0);
      }
    });

    return { labels: labels.reverse(), data: data.reverse() };
  }

  async getSchedule(id: string) {
    const schedule = await this.scheduleCollection
      .aggregate([
        { $match: { _id: new ObjectId(id) } },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
            pipeline: [
              {
                $project: {
                  phone: 1,
                  numberId: 1,
                  name: 1,
                  job: 1,
                  gender: 1,
                  email: 1,
                  birthday: 1,
                  address: 1,
                  fullName: 1,
                  avatar: 1
                }
              }
            ]
          }
        },
        { $unwind: '$user' },
        {
          $lookup: {
            from: 'users',
            localField: 'doctorId',
            foreignField: '_id',
            as: 'doctor',
            pipeline: [
              { $project: { phone: 1, numberId: 1, name: 1, job: 1, gender: 1, email: 1, birthday: 1, address: 1 } }
            ]
          }
        },
        { $unwind: '$doctor' }
      ])
      .toArray();
    const data = schedule[0];
    if (!data) throw new BadRequestException({ message: 'Không tìm thấy lịch khám' });
    return { ...schedule[0], dayIn: data?.from, status: '' };
  }

  async writeMedicalRecord(id: string) {
    const schedule = await this.scheduleCollection.count({ _id: new ObjectId(id) });
    if (!schedule) throw new BadRequestException({ message: 'Không tìm thấy lịch khám' });

    await this.scheduleCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { writeRecord: true, status: SCHEDULE_STATUS.COMPLETED, completedAt: new Date() } }
    );
    return { status: true };
  }

  async rating(id: string, rating: number) {
    await this.scheduleCollection.findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { rating } });
    return { status: true };
  }

  async updateSchedule(id: string, body: VerifyDto) {
    const schedule = await this.scheduleCollection.findOne({ _id: new ObjectId(id) });
    const user = await this.userCollection.findOne({ _id: new ObjectId(schedule.userId) });
    const { from, room } = schedule;
    const offset = 7 * 60 * 60 * 1000; // Convert 7 hours to milliseconds
    const _from = new Date(new Date(from).getTime() + offset);
    const time = `${_from.getUTCHours()}:${_from.getUTCMinutes()} - ${_from.getDate()}/${
      _from.getUTCMonth() + 1
    }/${_from.getUTCFullYear()}`;

    await this.scheduleCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...body,
          updatedAt: new Date()
        }
      }
    );

    if (body.status === SCHEDULE_STATUS.PROGRESS) {
      await this.notificationCollection.insertOne({
        title: `Lịch khám bệnh ${time} [${room}]`,
        description: 'Bác sĩ đã xác nhận lịch khám của bạn',
        receiver: schedule.userId,
        type: NotificationType.SUCCESS,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await this.mailerService.sendMail({
        to: user.email,
        from: 'tnthang.18it5@vku.udn.vn',
        subject: `Lịch khám bệnh ${time} [${room}]`,
        text: `Xin chào bạn!`,
        html: `<p>Bác sĩ đã xác nhận lịch khám của bạn.<br/>Vui lòng đến phòng khám đúng giờ. <br/><br/>Trân trọng. </p>`
      });
    } else {
      await this.notificationCollection.insertOne({
        title: `Lịch khám bệnh ${time} [${room}]`,
        description: 'Bác sĩ đã từ chối lịch khám của bạn',
        receiver: schedule.userId,
        type: NotificationType.DANGER,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await this.mailerService.sendMail({
        to: user.email,
        from: 'tnthang.18it5@vku.udn.vn',
        subject: `Lịch khám bệnh ${time} [${room}]`,
        text: `Xin chào bạn!`,
        html: `<p>Bác sĩ đã từ chối lịch khám của bạn.<br/>Bạn có thể kiểm chi tiết trong quản lý lịch khám. <br/><br/>Trân trọng. </p>`
      });
    }

    return { state: true };
  }

  async getNotYetSchedules(query: Pagination) {
    const { page: pageNum, size } = query;
    const { page, skip, take } = getPagination(pageNum, size);

    const filter: FilterQuery<unknown> = {
      doctorId: null
    };
    const sortData: FilterQuery<unknown> = {
      createdAt: -1
    };

    const [totalRecords, data] = await Promise.all([
      this.scheduleCollection.count(filter),
      this.scheduleCollection
        .aggregate([
          { $match: filter },
          {
            $lookup: {
              from: 'users',
              localField: 'userId',
              foreignField: '_id',
              as: 'user',
              pipeline: [{ $project: { password: 0 } }]
            }
          },
          { $unwind: '$user' }
        ])
        .skip(skip)
        .limit(take)
        .sort(sortData)
        .toArray()
    ]);

    return {
      data,
      page,
      size: take,
      totalRecords
    };
  }

  async setDoctorForSchedule(scheduleId: string, staffId: string, body: SetDoctorScheduleDto) {
    await this.scheduleCollection.updateOne(
      { _id: new ObjectId(scheduleId) },
      {
        $set: { doctorId: new ObjectId(body.doctorId), setBy: new ObjectId(staffId), status: SCHEDULE_STATUS.PROGRESS }
      }
    );

    return { status: true };
  }
}
