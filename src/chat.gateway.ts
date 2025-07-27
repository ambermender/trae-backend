import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RoomService } from './room.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  email?: string;
  currentRoom?: string;
}

interface ChatMessage {
  id: string;
  message: string;
  userId: string;
  email: string;
  roomId: string;
  timestamp: Date;
}

interface RoomUser {
  userId: string;
  email: string;
  socketId: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Room'daki aktif kullanıcıları takip et
  private roomUsers = new Map<string, Map<string, RoomUser>>();
  // Socket ID'den user bilgisine mapping
  private socketToUser = new Map<string, { userId: string; email: string }>();

  constructor(
    private jwtService: JwtService,
    private roomService: RoomService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Token'ı query'den al
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      
      if (!token) {
        client.disconnect();
        return;
      }

      // JWT token'ı verify et
      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.email = payload.email;

      // Socket mapping'i kaydet
      this.socketToUser.set(client.id, {
        userId: client.userId!,
        email: client.email!,
      });

      console.log(`User connected: ${client.email} (${client.id})`);
      
      // Kullanıcının room'larını gönder
      const userRooms = await this.roomService.getUserRooms(client.userId!);
      client.emit('user-rooms', userRooms);
      
    } catch (error) {
      console.log('Authentication failed:', error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    console.log(`User disconnected: ${client.email} (${client.id})`);
    
    // Kullanıcıyı tüm room'lardan çıkar
    if (client.currentRoom) {
      this.leaveRoom(client, client.currentRoom);
    }
    
    // Socket mapping'i temizle
    this.socketToUser.delete(client.id);
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    try {
      // Önceki room'dan ayrıl
      if (client.currentRoom) {
        this.leaveRoom(client, client.currentRoom);
      }

      // Room'un var olup olmadığını kontrol et
      const room = await this.roomService.getRoomById(data.roomId);
      
      // Socket.io room'una katıl
      client.join(data.roomId);
      client.currentRoom = data.roomId;

      // Room kullanıcıları listesini güncelle
      if (!this.roomUsers.has(data.roomId)) {
        this.roomUsers.set(data.roomId, new Map());
      }
      
      const roomUserMap = this.roomUsers.get(data.roomId)!;
      roomUserMap.set(client.userId!, {
        userId: client.userId!,
        email: client.email!,
        socketId: client.id,
      });

      // Room'daki tüm kullanıcılara yeni kullanıcıyı bildir
      const roomUsers = Array.from(roomUserMap.values());
      this.server.to(data.roomId).emit('room-users', roomUsers);
      
      // Kullanıcıya room bilgilerini gönder
      client.emit('joined-room', {
        room,
        users: roomUsers,
      });

      console.log(`${client.email} joined room: ${data.roomId}`);
      
    } catch (error) {
      client.emit('error', { message: 'Room bulunamadı' });
    }
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    this.leaveRoom(client, data.roomId);
  }

  @SubscribeMessage('send-message')
  handleMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { message: string; roomId: string },
  ) {
    if (!client.currentRoom || client.currentRoom !== data.roomId) {
      client.emit('error', { message: 'Room\'a katılmalısınız' });
      return;
    }

    const chatMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: data.message,
      userId: client.userId!,
      email: client.email!,
      roomId: data.roomId,
      timestamp: new Date(),
    };

    // Room'daki tüm kullanıcılara mesajı gönder
    this.server.to(data.roomId).emit('new-message', chatMessage);
    
    console.log(`Message in ${data.roomId} from ${client.email}: ${data.message}`);
  }

  @SubscribeMessage('video-control')
  handleVideoControl(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: {
      action: 'play' | 'pause' | 'seek';
      timestamp?: number;
      roomId: string;
    },
  ) {
    if (!client.currentRoom || client.currentRoom !== data.roomId) {
      return;
    }

    // Room'daki diğer kullanıcılara video kontrolünü gönder
    client.to(data.roomId).emit('video-sync', {
      action: data.action,
      timestamp: data.timestamp,
      userId: client.userId!,
      email: client.email!,
    });

    console.log(`Video ${data.action} in ${data.roomId} by ${client.email}`);
  }

  @SubscribeMessage('webrtc-signal')
  handleWebRTCSignal(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: {
      targetUserId: string;
      signal: any;
      roomId: string;
    },
  ) {
    if (!client.currentRoom || client.currentRoom !== data.roomId) {
      return;
    }

    // Hedef kullanıcıya WebRTC sinyalini gönder
    const roomUserMap = this.roomUsers.get(data.roomId);
    if (roomUserMap) {
      const targetUser = roomUserMap.get(data.targetUserId);
      if (targetUser) {
        this.server.to(targetUser.socketId).emit('webrtc-signal', {
          fromUserId: client.userId!,
          signal: data.signal,
        });
      }
    }
  }

  private leaveRoom(client: AuthenticatedSocket, roomId: string) {
    client.leave(roomId);
    
    // Room kullanıcıları listesinden çıkar
    const roomUserMap = this.roomUsers.get(roomId);
    if (roomUserMap && client.userId) {
      roomUserMap.delete(client.userId);
      
      // Room'daki diğer kullanıcılara güncellemeyi gönder
      const remainingUsers = Array.from(roomUserMap.values());
      this.server.to(roomId).emit('room-users', remainingUsers);
      
      // Room boşsa temizle
      if (roomUserMap.size === 0) {
        this.roomUsers.delete(roomId);
      }
    }
    
    if (client.currentRoom === roomId) {
      client.currentRoom = undefined;
    }
    
    console.log(`${client.email} left room: ${roomId}`);
  }

  // Room'daki kullanıcı sayısını al
  getRoomUserCount(roomId: string): number {
    const roomUserMap = this.roomUsers.get(roomId);
    return roomUserMap ? roomUserMap.size : 0;
  }

  // Aktif room'ları al
  getActiveRooms(): string[] {
    return Array.from(this.roomUsers.keys());
  }
}