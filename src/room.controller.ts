import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RoomService, CreateRoomDto, UpdateRoomDto } from './room.service';

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  // Room oluştur
  @Post()
  async createRoom(@Request() req, @Body() createRoomDto: CreateRoomDto) {
    return this.roomService.createRoom(req.user.userId, createRoomDto);
  }

  // Public room'ları listele
  @Get('public')
  async getPublicRooms() {
    return this.roomService.getPublicRooms();
  }

  // Kullanıcının room'larını listele
  @Get('my-rooms')
  async getUserRooms(@Request() req) {
    return this.roomService.getUserRooms(req.user.userId);
  }

  // Room detayını getir
  @Get(':id')
  async getRoomById(@Param('id') roomId: string) {
    return this.roomService.getRoomById(roomId);
  }

  // Room güncelle
  @Put(':id')
  async updateRoom(
    @Param('id') roomId: string,
    @Request() req,
    @Body() updateRoomDto: UpdateRoomDto
  ) {
    return this.roomService.updateRoom(roomId, req.user.userId, updateRoomDto);
  }

  // Room sil
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRoom(@Param('id') roomId: string, @Request() req) {
    await this.roomService.deleteRoom(roomId, req.user.userId);
  }

  // Room'a katıl
  @Post(':id/join')
  async joinRoom(@Param('id') roomId: string, @Request() req) {
    return this.roomService.joinRoom(roomId, req.user.userId);
  }

  // Room'dan ayrıl
  @Post(':id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leaveRoom(@Param('id') roomId: string, @Request() req) {
    await this.roomService.leaveRoom(roomId, req.user.userId);
  }

  // Room üyelerini listele
  @Get(':id/members')
  async getRoomMembers(@Param('id') roomId: string) {
    return this.roomService.getRoomMembers(roomId);
  }
}