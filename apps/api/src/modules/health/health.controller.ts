import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BAAS_PROVIDER, type BaasProvider } from '../../baas/baas.port.js';
import { Public } from '../../common/request-context.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@Inject(BAAS_PROVIDER) private readonly baas: BaasProvider) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Liveness probe' })
  check(): { status: 'ok'; provider: string; uptimeSeconds: number } {
    return { status: 'ok', provider: this.baas.name, uptimeSeconds: Math.round(process.uptime()) };
  }
}
