import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { Public } from './modules/auth/decorators/public.decorator';

@ApiExcludeController()
@Controller()
export class AppController {
  @Public()
  @Get()
  root(): { name: string; version: string; status: string } {
    return {
      name: 'Zonvo API',
      version: '1.0.0',
      status: 'operational',
    };
  }
}
