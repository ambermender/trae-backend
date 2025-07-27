import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth.module';
import { RoomModule } from './room.module';
import { ChatModule } from './chat.module';

@Module({
  imports: [AuthModule, RoomModule, ChatModule],
  controllers: [AppController, UserController],
  providers: [AppService, UserService, PrismaService],
})
export class AppModule {}
