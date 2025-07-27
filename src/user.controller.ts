import { Controller, Get, Post, Body, Param, UseGuards, Delete } from '@nestjs/common';
import { UserService, CreateUserDto } from './user.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AdminGuard } from './admin.guard';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Herkese açık - kullanıcı oluşturma (register yerine kullanılabilir)
  @Post()
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.userService.createUser(createUserDto);
  }

  // JWT korumalı - tüm kullanıcıları görme
  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllUsers() {
    return this.userService.getAllUsers();
  }

  // JWT korumalı - belirli kullanıcıyı görme
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }

  // Admin korumalı - kullanıcı silme
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }
}