import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PluggyClient } from './pluggy.client';

/** Identifies this installation to Pluggy. Single-user app, so a constant is enough. */
const CLIENT_USER_ID = 'kevin';

/**
 * Lifecycle of the bank connections themselves — creating, listing, refreshing, removing.
 *
 * Kept apart from `OpenFinanceService`, which only moves data: a connection is established
 * once and then read many times, and the two have no reason to change together.
 */
@Injectable()
export class PluggyConnectionsService {
  private readonly logger = new Logger(PluggyConnectionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pluggy: PluggyClient,
  ) {}

  findAll() {
    return this.prisma.pluggyConnection.findMany({ orderBy: { createdAt: 'asc' } });
  }

  /** Token for a fresh connection in the Connect widget. */
  createConnectToken(): Promise<string> {
    return this.pluggy.createConnectToken(CLIENT_USER_ID);
  }

  /**
   * Token that reopens the widget in update mode for an existing connection.
   *
   * Open Finance consent lasts at most 12 months; this is how it gets renewed without
   * losing the item and the history already keyed to it.
   */
  async createReconnectToken(id: string): Promise<string> {
    const connection = await this.findOneOrFail(id);
    return this.pluggy.createConnectToken(CLIENT_USER_ID, connection.itemId);
  }

  /**
   * Records an item the widget just returned.
   *
   * Upsert rather than create: reconnecting in update mode hands back the same item id,
   * and that should refresh the existing row instead of colliding with it.
   */
  async register(itemId: string) {
    const item = await this.pluggy.fetchItem(itemId).catch(() => null);
    if (!item) {
      throw new BadRequestException(
        `Pluggy does not recognise item ${itemId}. It may belong to a different application.`,
      );
    }

    const data = {
      connectorName: item.connector?.name ?? 'Open Finance',
      connectorId: item.connector?.id ?? null,
      status: item.status ?? 'UNKNOWN',
    };

    const connection = await this.prisma.pluggyConnection.upsert({
      where: { itemId },
      update: data,
      create: { itemId, ...data },
    });

    this.logger.log(`Registered Pluggy connection "${data.connectorName}" (item ${itemId})`);
    return connection;
  }

  /** Re-reads the item so a consent that expired since the last sync shows up as such. */
  async refreshStatus(id: string) {
    const connection = await this.findOneOrFail(id);
    const item = await this.pluggy.fetchItem(connection.itemId).catch(() => null);
    if (!item) {
      return this.prisma.pluggyConnection.update({
        where: { id },
        data: { status: 'NOT_FOUND' },
      });
    }
    return this.prisma.pluggyConnection.update({
      where: { id },
      data: {
        status: item.status ?? 'UNKNOWN',
        connectorName: item.connector?.name ?? connection.connectorName,
        connectorId: item.connector?.id ?? connection.connectorId,
      },
    });
  }

  async remove(id: string) {
    await this.findOneOrFail(id);
    // Only the local record goes. Accounts and transactions already imported are kept —
    // they are history, and the consent itself is revoked at the bank, not from here.
    return this.prisma.pluggyConnection.delete({ where: { id } });
  }

  async markSynced(itemIds: string[]) {
    if (itemIds.length === 0) return;
    await this.prisma.pluggyConnection.updateMany({
      where: { itemId: { in: itemIds } },
      data: { lastSyncAt: new Date() },
    });
  }

  /**
   * Item ids to sync: registered connections, or `PLUGGY_ITEM_IDS` when none exist yet.
   *
   * The environment fallback keeps installations that pre-date the widget working, and
   * disappears on its own once the first connection is registered.
   */
  async resolveItemIds(): Promise<string[]> {
    const connections = await this.prisma.pluggyConnection.findMany({ select: { itemId: true } });
    if (connections.length > 0) return connections.map((c) => c.itemId);
    return this.pluggy.configuredItemIds;
  }

  private async findOneOrFail(id: string) {
    const connection = await this.prisma.pluggyConnection.findUnique({ where: { id } });
    if (!connection) throw new NotFoundException(`Connection ${id} not found`);
    return connection;
  }
}
