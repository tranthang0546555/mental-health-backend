import { BadRequestException } from '@nestjs/common';
import { AES, enc } from 'crypto-js';
import { AlchemyProvider, Contract, Provider, Wallet } from 'ethers';
import { ConfigService } from '../config';
import * as MedicalRecord from './MedicalRecord.json';

export class ContractService {
  private contract: Contract;
  private provider: Provider;
  private apiKey: string;
  private privateKey: string;
  private address: string;
  private wallet: Wallet;
  private config: ConfigService;
  private secret: string;

  constructor() {
    this.config = new ConfigService();

    this.apiKey = this.config.get('API_KEY');
    this.privateKey = this.config.get('PRIVATE_KEY');
    this.address = this.config.get('CONTRACT_ADDRESS');
    this.secret = this.config.get('SECRET');
    this.provider = new AlchemyProvider('goerli', this.apiKey);
    this.wallet = new Wallet(this.privateKey, this.provider);
    this.contract = new Contract(this.address, MedicalRecord.abi, this.wallet);
  }

  public async getRecords() {
    const records = await this.contract.getRecords();
    const data = records.map(this.parse);
    return data;
  }

  public async getRecordById(recordId: number) {
    try {
      const data = await this.contract.getRecordById(recordId);
      return {
        record: this.parse(data.record),
        histories: data.histories.map(this.parse)
      }
    } catch (error) {
      throw new BadRequestException('Medical record does not exist');
    }
  }

  public async getRecordsByNumberId(numberId: string) {
    try {
      const records = await this.contract.getRecordsByNumberId(numberId);
      const data = records.map(this.parse);
      return data;
    } catch (error) {
      throw new BadRequestException('Medical record does not exist');
    }
  }

  public async getRecordsCreatedByDoctorId(doctorId: string) {
    const records = await this.contract.getRecordsCreatedByDoctorId(doctorId);
    const data = records.map(this.parse);
    return data;
  }

  public async getRecordsByUserId(userId: string) {
    const records = await this.contract.getRecordsByUserId(userId);
    const data = records.map(this.parse);
    return data;
  }

  public async createRecord(data: string, userId: string, numberId: string, doctorId: string) {
    const status = await this.contract.createRecord(this.encode(data), userId, numberId, doctorId);
    return { status };
  }

  public async updateRecord(recordId: number, data: string) {
    try {
      const status = await this.contract.updateRecord(recordId, this.encode(data));
      return { status };
    } catch (error) {
      throw new BadRequestException('Medical record does not exist');
    }
  }

  public async deleteRecord(recordId: number) {
    try {
      const status = await this.contract.deleteRecord(recordId);
      return { status };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  private encode = (str: string) => AES.encrypt(JSON.stringify(str), this.secret).toString();
  private decode = (str: string) => {
    const bytes = AES.decrypt(str, this.secret);
    return JSON.parse(bytes.toString(enc.Utf8));
  };

  private parse = (record: any) => ({
    id: parseInt(record.id),
    data: JSON.parse(this.decode(record?.data)),
    isDeleted: record.isDeleted,
    userId: record.userId,
    doctorId: record.doctorId,
    createdAt: new Date(parseInt(record.createdAt) * 1000),
    updatedAt: record.updatedAt ? new Date(parseInt(record.updatedAt) * 1000) : null,
    pushedAt: record.pushedAt ? new Date(parseInt(record.pushedAt) * 1000) : null,
  });
}
