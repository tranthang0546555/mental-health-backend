import { MailerService } from '@nestjs-modules/mailer';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt/dist';
import { InjectConnection } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { ObjectId } from 'mongodb';
import { Collection, Connection } from 'mongoose';
import { generate } from 'randomstring';
import { ConfigService } from '../../config';
import { ERROR_ACCOUNT_CODE, Role } from '../../constants';
import { AccountChangePasswordDto, AccountDto, ProfileUpdateDto } from './dto';
@Injectable()
export class AuthService {
  private readonly userCollection: Collection;
  private readonly verifyCollection: Collection;
  constructor(
    @InjectConnection() private connection: Connection,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService
  ) {
    this.userCollection = this.connection.collection('users');
    this.verifyCollection = this.connection.collection('verify');
  }

  async loginFB(fbId?: string, email?: string) {
    let data;
    if (fbId) {
      const userExist = await this.userCollection.findOne({ userId: fbId }, { projection: { password: 0 } });
      if (!userExist) {
        data = await this.userCollection.insertOne({ userId: fbId, email, role: Role.USER });
      } else {
        data = userExist;
      }
    }
    if (email) {
      const userExist = await this.userCollection.findOne({ email: email, role: Role.USER });
      if (!userExist) {
        data = await this.userCollection.insertOne({ email });
      } else {
        data = userExist;
      }
    }

    const payload = {
      id: data?._id,
      role: data?.role
    };

    return {
      accessToken: this.jwtService.sign(payload, { secret: ConfigService.getInstance().get('JWT_SECRET') }),
      user: data
    };
  }

  async getProfile(id: string) {
    const profile = await this.userCollection.findOne<any>(
      { _id: new ObjectId(id), lock: { $ne: true } },
      { projection: { password: 0, updatedAt: 0 } }
    );
    if (!profile) throw new UnauthorizedException();
    return profile;
  }

  async register(input: AccountDto) {
    const { email, password } = input;

    const emailExist = await this.userCollection.findOne({ email: email });
    if (emailExist) throw new BadRequestException({ field: 'email', message: 'Email đã được sử dụng' });

    const passwordHashed = bcrypt.hashSync(password, 10);
    await this.userCollection.insertOne({
      email,
      password: passwordHashed,
      verify: false,
      role: Role.USER,
      avatar: 'default-avatar.jpg'
    });

    const code = Math.round(Math.random() * 100000);
    await this.verifyCollection.insertOne({ email, code, createdAt: new Date(), expiresIn: '24h' });

    const token = this.jwtService.sign(
      { email, code },
      { expiresIn: '24h', secret: ConfigService.getInstance().get('JWT_SECRET') }
    );

    const sendMail = await this.mailerService.sendMail({
      to: email,
      from: 'admin@mental-health.com',
      subject: 'Xác nhận tài khoản đăng ký từ hệ thống SKTT',
      text: `Xin chào bạn!`,
      html: `<p>Xin chào bạn!</p><p>Nhấn <a href="${ConfigService.getInstance().get(
        'DOMAIN'
      )}/api/v1/auth/verify-email?token=${token}">vào đây</a> để xác nhận đăng ký tài khoản của bạn!</p>`
    });

    if (sendMail?.response?.includes('250'))
      return {
        message: 'Bạn vui lòng kiểm tra email để hoàn tất đăng ký!'
      };

    throw new BadRequestException({ message: 'Tạo tài khoản thất bại' });
  }

  async accountActive(email: string) {
    const accountExist = await this.userCollection.findOne({ email });
    if (!accountExist) throw new BadRequestException({ message: 'Tài khoản không tồn tại, vui lòng đăng ký' });
    const activated = await this.userCollection.findOne({ email, verify: true });
    if (activated) throw new BadRequestException({ message: 'Tài khoản đã được kích hoạt' });

    const code = Math.round(Math.random() * 100000);
    await this.verifyCollection.insertOne({ email, code, createdAt: new Date(), expiresIn: '24h' });

    const token = this.jwtService.sign(
      { email, code },
      { expiresIn: '24h', secret: ConfigService.getInstance().get('JWT_SECRET') }
    );

    const sendMail = await this.mailerService.sendMail({
      to: email,
      from: 'tnthang.18it5@vku.udn.vn',
      subject: 'Xác nhận tài khoản đăng ký từ hệ thống SKTT',
      text: `Xin chào bạn!`,
      html: `<p>Xin chào bạn!</p><p>Nhấn <a href="${ConfigService.getInstance().get(
        'DOMAIN'
      )}/api/v1/auth/verify-email?token=${token}">vào đây</a> để xác nhận đăng ký tài khoản của bạn!</p>`
    });

    if (sendMail?.response?.includes('250'))
      return {
        message: 'Bạn vui lòng kiểm tra email để hoàn tất đăng ký!'
      };

    throw new BadRequestException({ message: 'Kích hoạt tài khoản thất bại' });
  }

  async verifyEmail(token: string) {
    const decode = await this.jwtService.verifyAsync(token, {
      ignoreExpiration: false,
      secret: ConfigService.getInstance().get('JWT_SECRET')
    });

    if (decode) {
      const { email, code } = decode;
      const verityCode = await this.verifyCollection.findOne(
        { email, used: { $ne: true } },
        { limit: 1, sort: { _id: -1 } }
      );

      if (code == verityCode?.code) {
        await Promise.all([
          this.userCollection.updateOne({ email }, { $set: { verify: true } }),
          this.verifyCollection.updateOne({ _id: new ObjectId(verityCode?._id) }, { $set: { used: true } })
        ]);
        return { message: 'Xác nhận tài khoản hoàn tất, bạn có thể đóng cửa sổ này!' };
      }
      throw new BadRequestException({ message: 'Token đã được sử dụng, vui lòng kiểm tra lại!' });
    }
    throw new BadRequestException({ message: 'Token không hợp lệ, vui lòng kiểm tra lại!' });
  }

  async forgotPassword(email: string) {
    const userExist = await this.userCollection.findOne({ email: email });
    if (!userExist) throw new BadRequestException({ field: 'email', message: 'Tài khoản không tồn tại' });

    const newPassword = generate({ length: 10 });
    const passwordHashed = bcrypt.hashSync(newPassword, 10);

    await this.mailerService.sendMail({
      to: email,
      from: 'tnthang.18it5@vku.udn.vn',
      subject: 'Quên mật khẩu',
      text: `Xin chào bạn!`,
      html: `<p>Xin chào bạn!</p><p>Mật khẩu mới của bạn là: ${newPassword}, vui lòng thay đổi mật khẩu mới để tiếp tục sử dụng.</p>`
    });

    await this.userCollection.findOneAndUpdate({ email: email }, { $set: { password: passwordHashed } });
    return { message: 'Mật khẩu mới đã được gửi vào email của bạn' };
  }

  async changePassword(input: AccountChangePasswordDto) {
    const { email, newPassword, oldPassword } = input;

    const userExist = await this.userCollection.findOne({ email: email });
    if (!userExist) throw new BadRequestException({ field: 'email', message: 'Tài khoản không tồn tại' });

    const comparePW = bcrypt.compareSync(oldPassword, userExist?.password);
    if (!comparePW) throw new BadRequestException({ field: 'oldPassword', message: 'Mật khẩu cũ không đúng' });

    const passwordHashed = bcrypt.hashSync(newPassword, 10);
    await this.userCollection.updateOne({ email: email }, { $set: { password: passwordHashed } });

    return { status: true };
  }

  async login(input: AccountDto) {
    const { email, password } = input;

    const userExist = await this.userCollection.findOne({ email: email });
    if (!userExist) throw new BadRequestException({ field: 'email', message: 'Tài khoản chưa được đăng ký' });

    const comparePW = bcrypt.compareSync(password, userExist?.password);
    if (!comparePW) throw new BadRequestException({ field: 'password', message: 'Mật khẩu không đúng' });

    if (!userExist?.verify)
      throw new BadRequestException({
        message: 'Tài khoản chưa kích hoạt',
        code: ERROR_ACCOUNT_CODE.NOT_ACTIVATED,
        email
      });

    if (userExist?.lock)
    throw new BadRequestException({
      message: 'Tài khoản đã bị cấm truy cập',
      code: ERROR_ACCOUNT_CODE.BANNED,
      email
    });

    const payload = {
      id: userExist?._id,
      role: userExist?.role
    };

    return {
      accessToken: this.jwtService.sign(payload, { secret: ConfigService.getInstance().get('JWT_SECRET') })
    };
  }

  async updateProfile(uId: string, input: ProfileUpdateDto) {
    const {
      fullName,
      firstName,
      lastName,
      address,
      birthday,
      degree,
      experience,
      gender,
      phone,
      job,
      numberId,
      fullNameRelative,
      addressRelative,
      phoneRelative
    } = input;
    const data = {
      fullName,
      name: {
        firstName,
        lastName
      },
      gender,
      phone,
      description: {
        experience,
        degree
      },
      birthday,
      address,
      job,
      numberId,
      updatedAt: new Date(),
      fullNameRelative,
      addressRelative,
      phoneRelative
    };
    await this.userCollection.findOneAndUpdate({ _id: new ObjectId(uId) }, { $set: data });

    return await this.userCollection.findOne<any>(
      { _id: new ObjectId(uId) },
      { projection: { password: 0, updatedAt: 0 } }
    );
  }

  async changeAvatar(uId: string, filename: string) {
    await this.userCollection.findOneAndUpdate({ _id: new ObjectId(uId) }, { $set: { avatar: filename } });
    return { avatar: filename };
  }
}
