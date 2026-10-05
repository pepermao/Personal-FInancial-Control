import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { OpenFinanceService } from './open-finance.service';
import { PluggyConnectionsService } from './pluggy-connections.service';
import { PluggyClient } from './pluggy.client';
import { SyncPluggyDto } from './dto/sync-pluggy.dto';
import { RegisterConnectionDto } from './dto/register-connection.dto';

@Controller('open-finance')
export class OpenFinanceController {
  constructor(
    private readonly openFinanceService: OpenFinanceService,
    private readonly connections: PluggyConnectionsService,
    private readonly pluggy: PluggyClient,
  ) {}

  /** Reports configuration without ever exposing the credentials themselves. */
  @Get('status')
  async status() {
    const connections = await this.connections.findAll();
    return {
      configured: this.pluggy.isConfigured,
      connectionCount: connections.length,
      /** Legacy env-based items, still honoured when nothing is registered yet. */
      itemCount: this.pluggy.configuredItemIds.length,
    };
  }

  @Get('connections')
  listConnections() {
    return this.connections.findAll();
  }

  /** Mints the token the Connect widget needs to open. */
  @Post('connect-token')
  async connectToken() {
    return { accessToken: await this.connections.createConnectToken() };
  }

  /** Reopens the widget in update mode so an expired consent can be renewed in place. */
  @Post('connections/:id/reconnect-token')
  async reconnectToken(@Param('id') id: string) {
    return { accessToken: await this.connections.createReconnectToken(id) };
  }

  /** Persists the item id the widget hands back once the user authorises. */
  @Post('connections')
  registerConnection(@Body() dto: RegisterConnectionDto) {
    return this.connections.register(dto.itemId);
  }

  @Post('connections/:id/refresh')
  refreshConnection(@Param('id') id: string) {
    return this.connections.refreshStatus(id);
  }

  @Delete('connections/:id')
  removeConnection(@Param('id') id: string) {
    return this.connections.remove(id);
  }

  @Post('sync')
  sync(@Body() dto: SyncPluggyDto) {
    return this.openFinanceService.sync(dto.days, dto.itemIds);
  }
}
