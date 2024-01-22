import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { Collection, Connection } from 'mongoose';
import { SCHEDULE_STATUS } from '../../constants';
import { ContractService } from '../../contract';
import { CreateRecordDto, UpdateRecordDto } from './dto';
@Injectable()
export class RecordService {
  private contract: ContractService;
  private userCollection: Collection;
  private readonly scheduleCollection: Collection;
  private readonly notificationCollection: Collection;
  constructor(@InjectConnection() private connection: Connection) {
    this.contract = new ContractService();
    this.userCollection = this.connection.collection('users');
    this.scheduleCollection = this.connection.collection('schedules');
    this.notificationCollection = this.connection.collection('notifications');
  }

  async getAll() {
    const data = await this.contract.getRecords();
    return data;
  }

  async getRecordById(id: number) {
    const data = await this.contract.getRecordById(id);
    const [user, doctor] = await Promise.all([
      this.userCollection.findOne({ _id: new ObjectId(data.record.userId) }, { projection: { password: 0 } }),
      this.userCollection.findOne({ _id: new ObjectId(data.record.doctorId) }, { projection: { password: 0 } })
    ]);
    data['user'] = user;
    data['doctor'] = doctor;
    return data;
  }

  async getRecordsByNumberId(id: string) {
    const data = await this.contract.getRecordsByNumberId(id);
    const records = await Promise.all(
      data.map(async (record, index) => {
        const doctor = await this.userCollection.findOne(
          { _id: new ObjectId(record.doctorId) },
          { projection: { password: 0 } }
        );
        return (data[index] = { ...record, doctor });
      })
    );

    return records;
  }

  async getRecordsByUserId(id: string) {
    const data = await this.contract.getRecordsByUserId(id);
    const records = await Promise.all(
      data.map(async (record, index) => {
        const [doctor, user] = await Promise.all([
          this.userCollection.findOne({ _id: new ObjectId(record.doctorId) }, { projection: { password: 0 } }),
          this.userCollection.findOne({ _id: new ObjectId(record.userId) }, { projection: { password: 0 } })
        ]);
        return (data[index] = { ...record, doctor, user });
      })
    );

    return records;
  }

  async getRecordsCreatedByDoctorId(id: string) {
    const data = await this.contract.getRecordsCreatedByDoctorId(id);
    const records = await Promise.all(
      data.map(async (record, index) => {
        const user = await this.userCollection.findOne(
          { _id: new ObjectId(record.userId) },
          { projection: { password: 0 } }
        );
        return (data[index] = { ...record, user });
      })
    );

    return records;
  }

  async createRecord(doctorId: string, body: CreateRecordDto) {
    const [doctor, user] = await Promise.all([
      this.userCollection.findOne({ _id: new ObjectId(doctorId) }, { projection: { password: 0 } }),
      this.userCollection.findOne({ _id: new ObjectId(body.userId) }, { projection: { password: 0 } })
    ]);

    const data = JSON.stringify({ ...body, doctorId, user, doctor });


    await this.contract.createRecord(data, body.userId, user.numberId, doctorId);
    await this.scheduleCollection.updateOne(
      { _id: new ObjectId(body.scheduleId) },
      { $set: { status: SCHEDULE_STATUS.COMPLETED, updatedAt: new Date() } }
    );
    return { status: true };
  }

  async updateRecord(recordId: number, body: UpdateRecordDto) {
    const {record} = await this.contract.getRecordById(recordId);
    const data = JSON.stringify({ ...record.data, ...body });
    await this.contract.updateRecord(recordId, data);
    return { status: true };
  }

  async deleteRecord(recordId: number) {
    await this.contract.deleteRecord(recordId);
    return { status: true };
  }
}
