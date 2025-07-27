import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Room, RoomMember } from '@prisma/client';

export interface CreateRoomDto {
  name: string;
  description?: string;
  isPrivate?: boolean;
  maxMembers?: number;
}

export interface UpdateRoomDto {
  name?: string;
  description?: string;
  isPrivate?: boolean;
  maxMembers?: number;
}

@Injectable()
export class RoomService {
  constructor(private prisma: PrismaService) {}

  // Room oluştur
  async createRoom(ownerId: string, createRoomDto: CreateRoomDto): Promise<Room> {
    const room = await this.prisma.room.create({
      data: {
        name: createRoomDto.name,
        description: createRoomDto.description,
        isPrivate: createRoomDto.isPrivate || false,
        maxMembers: createRoomDto.maxMembers || 10,
        ownerId,
      },
      include: {
        owner: {
          select: { id: true, email: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, email: true }
            }
          }
        }
      }
    });

    // Room sahibini otomatik olarak üye yap
    await this.joinRoom(room.id, ownerId);

    return room;
  }

  // Tüm public room'ları listele
  async getPublicRooms(): Promise<Room[]> {
    return this.prisma.room.findMany({
      where: {
        isPrivate: false
      },
      include: {
        owner: {
          select: { id: true, email: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, email: true }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  // Kullanıcının room'larını listele
  async getUserRooms(userId: string): Promise<Room[]> {
    return this.prisma.room.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } }
        ]
      },
      include: {
        owner: {
          select: { id: true, email: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, email: true }
            }
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
  }

  // Room detayını getir
  async getRoomById(roomId: string): Promise<Room> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        owner: {
          select: { id: true, email: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, email: true }
            }
          }
        }
      }
    });

    if (!room) {
      throw new NotFoundException('Room bulunamadı');
    }

    return room;
  }

  // Room güncelle (sadece owner)
  async updateRoom(roomId: string, userId: string, updateRoomDto: UpdateRoomDto): Promise<Room> {
    const room = await this.getRoomById(roomId);

    if (room.ownerId !== userId) {
      throw new ForbiddenException('Sadece room sahibi güncelleyebilir');
    }

    return this.prisma.room.update({
      where: { id: roomId },
      data: updateRoomDto,
      include: {
        owner: {
          select: { id: true, email: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, email: true }
            }
          }
        }
      }
    });
  }

  // Room sil (sadece owner)
  async deleteRoom(roomId: string, userId: string): Promise<void> {
    const room = await this.getRoomById(roomId);

    if (room.ownerId !== userId) {
      throw new ForbiddenException('Sadece room sahibi silebilir');
    }

    await this.prisma.room.delete({
      where: { id: roomId }
    });
  }

  // Room'a katıl
  async joinRoom(roomId: string, userId: string): Promise<RoomMember> {
    const room = await this.getRoomById(roomId);

    // Zaten üye mi kontrol et
    const existingMember = await this.prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId
        }
      }
    });

    if (existingMember) {
      throw new BadRequestException('Zaten bu room\'un üyesisiniz');
    }

    // Maksimum üye sayısını kontrol et
    const memberCount = await this.prisma.roomMember.count({
      where: { roomId }
    });

    if (memberCount >= room.maxMembers) {
      throw new BadRequestException('Room dolu');
    }

    return this.prisma.roomMember.create({
      data: {
        userId,
        roomId
      },
      include: {
        user: {
          select: { id: true, email: true }
        },
        room: true
      }
    });
  }

  // Room'dan ayrıl
  async leaveRoom(roomId: string, userId: string): Promise<void> {
    const room = await this.getRoomById(roomId);

    // Room sahibi ayrılamaz
    if (room.ownerId === userId) {
      throw new BadRequestException('Room sahibi ayrılamaz. Room\'u silmelisiniz.');
    }

    const member = await this.prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId
        }
      }
    });

    if (!member) {
      throw new NotFoundException('Bu room\'un üyesi değilsiniz');
    }

    await this.prisma.roomMember.delete({
      where: {
        userId_roomId: {
          userId,
          roomId
        }
      }
    });
  }

  // Room üyelerini listele
  async getRoomMembers(roomId: string): Promise<RoomMember[]> {
    await this.getRoomById(roomId); // Room var mı kontrol et

    return this.prisma.roomMember.findMany({
      where: { roomId },
      include: {
        user: {
          select: { id: true, email: true }
        }
      },
      orderBy: {
        joinedAt: 'asc'
      }
    });
  }
}