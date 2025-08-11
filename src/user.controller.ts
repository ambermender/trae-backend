import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { UserService, CreateUserDto, LoginUserDto } from './user.service';

@ApiTags('users')
@Controller('users')
@UseGuards(ThrottlerGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Yeni kullanıcı kaydı',
    description: 'Yeni bir kullanıcı hesabı oluşturur. E-posta benzersiz olmalıdır.' 
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Kullanıcı başarıyla oluşturuldu',
    schema: {
      example: {
        id: 'uuid-string',
        email: 'kullanici@example.com',
        createdAt: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 409, description: 'E-posta adresi zaten kullanılıyor' })
  @ApiResponse({ status: 400, description: 'Geçersiz veri formatı' })
  async register(@Body() createUserDto: CreateUserDto) {
    return this.userService.createUser(createUserDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Kullanıcı girişi',
    description: 'E-posta ve şifre ile giriş yapar, JWT token döndürür.' 
  })
  @ApiBody({ type: LoginUserDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Giriş başarılı',
    schema: {
      example: {
        access_token: 'jwt-token-string',
        user: {
          id: 'uuid-string',
          email: 'kullanici@example.com',
          createdAt: '2024-01-01T00:00:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'E-posta veya şifre hatalı' })
  @ApiResponse({ status: 400, description: 'Geçersiz veri formatı' })
  async login(@Body() loginUserDto: LoginUserDto) {
    return this.userService.loginUser(loginUserDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Tüm kullanıcıları listele',
    description: 'Sistemdeki tüm kullanıcıları listeler (şifreler hariç).' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Kullanıcı listesi',
    schema: {
      example: [
        {
          id: 'uuid-string',
          email: 'kullanici1@example.com',
          createdAt: '2024-01-01T00:00:00.000Z'
        },
        {
          id: 'uuid-string-2',
          email: 'kullanici2@example.com',
          createdAt: '2024-01-02T00:00:00.000Z'
        }
      ]
    }
  })
  async getAllUsers() {
    return this.userService.getAllUsers();
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Kullanıcı detayı',
    description: 'Belirtilen ID\'ye sahip kullanıcının detaylarını getirir.' 
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Kullanıcının benzersiz ID\'si',
    example: 'uuid-string' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Kullanıcı detayları',
    schema: {
      example: {
        id: 'uuid-string',
        email: 'kullanici@example.com',
        createdAt: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Kullanıcı bulunamadı' })
  async getUserById(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }
}