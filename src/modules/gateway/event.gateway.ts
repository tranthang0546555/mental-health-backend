import { Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { WebSocketGateway, SubscribeMessage, WebSocketServer } from '@nestjs/websockets';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets/interfaces';
import { ObjectId } from 'mongodb';
import { Collection, Connection } from 'mongoose';
import { Socket, Server } from 'socket.io';
import { ConfigService } from '../../config';
import { JoinRoom, MessageDto, SendSignal } from './dto';

@WebSocketGateway({
  path: '/gateway',
  cors: true,
  transports: ['websocket']
})
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('Gateway');

  private users: Record<string, JoinRoom>;

  private readonly userCollection: Collection;
  private readonly scheduleCollection: Collection;
  constructor(@InjectConnection() private connection: Connection) {
    this.userCollection = this.connection.collection('users');
    this.scheduleCollection = this.connection.collection('schedules');
    this.users = {};
  }

  afterInit(server: any) {
    this.logger.log(server, 'Init');
    // throw new Error('Method not implemented.');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log('client connected', client.id);
  }

  handleDisconnect(client: Socket) {
    this.logger.log('client disconnected', client.id);
    this.server.to(this.users[client.id]?.room).emit('user-leave');
    delete this.users[client.id];
  }

  @SubscribeMessage('join-room')
  async joinRoom(client: Socket, payload: JoinRoom) {
    this.logger.log('join-room', JSON.stringify(payload));

    const { userId, room, nickname, socketId } = payload;
    client.join(room);

    this.users[client.id] = { ...payload, socketId: client.id };
    const otherUser = [...this.server.sockets.adapter.rooms.get(room)];

    if (otherUser.length == 1) return;
    this.server.to(otherUser[0]).emit('late-in', { ...payload, socketId: client.id });
    this.server.to(client.id).emit('first-in', this.users[otherUser[0]]);
  }

  @SubscribeMessage('send-signal')
  async sendSignal(socket: Socket, payload: SendSignal) {
    const { signal, socketId } = payload;
    this.logger.log('send-signal:' + ', sender:' + socket.id + ', receiver: ' + socketId);
    this.server.to(socketId).emit('receiving-signal', { signal, sender: socket.id });
  }

  @SubscribeMessage('re-send-signal')
  async reSendSignal(socket: Socket, payload: SendSignal) {
    const { signal, socketId } = payload;
    this.logger.log('re-send-signal:' + ', sender:' + socket.id + ', receiver: ' + socketId);
    this.server.to(socketId).emit('re-receiving-signal', { signal, sender: socket.id });
  }

  @SubscribeMessage('send-message')
  async sendMessage(socket: Socket, payload: MessageDto) {
    const { message, socketId } = payload;
    this.logger.log('send-message: ' + 'sender: ' + socket.id + ', receiver: ' + socketId);
    this.server.to(socketId).emit('receive-message', { message, socketId: socket.id } as MessageDto);
  }
}
