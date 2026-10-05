import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

const PLUGGY_BASE_URL = 'https://api.pluggy.ai';

/** API keys are valid for 2h. Refresh early so a long sync never dies mid-flight. */
const API_KEY_TTL_MS = 110 * 60 * 1000;

export interface PluggyAccount {
  id: string;
  itemId: string;
  type: 'BANK' | 'CREDIT';
  subtype: string;
  number: string | null;
  name: string;
  marketingName: string | null;
  balance: number;
  currencyCode: string;
  owner: string | null;
  taxNumber: string | null;
  bankData?: { transferNumber?: string | null; closingBalance?: number | null } | null;
  creditData?: {
    availableCreditLimit?: number | null;
    creditLimit?: number | null;
    balanceDueDate?: string | null;
    brand?: string | null;
    level?: string | null;
  } | null;
}

export interface PluggyTransaction {
  id: string;
  description: string;
  descriptionRaw: string | null;
  currencyCode: string;
  amount: number;
  date: string;
  balance: number | null;
  category: string | null;
  accountId: string;
  providerCode: string | null;
  providerId: string | null;
  status: 'PENDING' | 'POSTED';
  type: 'DEBIT' | 'CREDIT';
}

export interface PluggyItem {
  id: string;
  status: string;
  createdAt: string;
  lastUpdatedAt: string | null;
  connector?: { id?: number; name?: string } | null;
}

export interface PluggyInvestment {
  id: string;
  itemId: string;
  type: string;
  subtype: string | null;
  name: string;
  number: string | null;
  balance: number | null;
  value: number | null;
  quantity: number | null;
  amount: number | null;
  rate: number | null;
  annualRate: number | null;
  rateType: string | null;
  issuer: string | null;
  issueDate: string | null;
  dueDate: string | null;
  isin: string | null;
}

interface CursorPage<T> {
  results: T[];
  /** Full query string for the next page (e.g. "?accountId=...&after=..."), or null when exhausted. */
  next: string | null;
}

/**
 * Thin Pluggy REST client.
 *
 * Only reads. Credentials come from the environment and never leave the API process —
 * Pluggy's own docs are explicit that the client secret must stay server-side.
 */
@Injectable()
export class PluggyClient {
  private readonly logger = new Logger(PluggyClient.name);
  private apiKey: string | null = null;
  private apiKeyFetchedAt = 0;

  /** Item IDs come from config: GET /items listing is a paid-plan feature, unavailable on Meu Pluggy. */
  get configuredItemIds(): string[] {
    return (process.env.PLUGGY_ITEM_IDS ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  }

  /** Credentials alone are enough — items are registered through the Connect widget. */
  get isConfigured(): boolean {
    return Boolean(process.env.PLUGGY_CLIENT_ID && process.env.PLUGGY_CLIENT_SECRET);
  }

  private async authenticate(): Promise<string> {
    const fresh = this.apiKey && Date.now() - this.apiKeyFetchedAt < API_KEY_TTL_MS;
    if (fresh) return this.apiKey!;

    const clientId = process.env.PLUGGY_CLIENT_ID;
    const clientSecret = process.env.PLUGGY_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new ServiceUnavailableException(
        'PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET are not set',
      );
    }

    const response = await fetch(`${PLUGGY_BASE_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret }),
    });

    if (!response.ok) {
      // Never echo the body — it can contain the credentials we just sent.
      throw new ServiceUnavailableException(
        `Pluggy auth failed with HTTP ${response.status}`,
      );
    }

    const body = (await response.json()) as { apiKey?: string };
    if (!body.apiKey) throw new ServiceUnavailableException('Pluggy auth returned no apiKey');

    this.apiKey = body.apiKey;
    this.apiKeyFetchedAt = Date.now();
    this.logger.debug('Obtained a fresh Pluggy API key');
    return this.apiKey;
  }

  private async get<T>(path: string): Promise<T> {
    const apiKey = await this.authenticate();
    const response = await fetch(`${PLUGGY_BASE_URL}${path}`, {
      headers: { 'X-API-KEY': apiKey },
    });

    if (response.status === 401 || response.status === 403) {
      // Key may have been revoked early; drop it so the next call re-authenticates.
      this.apiKey = null;
      throw new ServiceUnavailableException(`Pluggy rejected the API key on ${path}`);
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new ServiceUnavailableException(
        `Pluggy GET ${path} failed with HTTP ${response.status}: ${detail.slice(0, 200)}`,
      );
    }

    return (await response.json()) as T;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const apiKey = await this.authenticate();
    const response = await fetch(`${PLUGGY_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new ServiceUnavailableException(
        `Pluggy POST ${path} failed with HTTP ${response.status}: ${detail.slice(0, 200)}`,
      );
    }

    return (await response.json()) as T;
  }

  /**
   * Mints a short-lived token (30 min) for the Connect widget.
   *
   * Passing an existing `itemId` opens the widget in update mode, which is how a
   * connection whose consent expired gets re-authorised without being recreated.
   */
  async createConnectToken(clientUserId: string, itemId?: string): Promise<string> {
    const body: Record<string, string> = { clientUserId };
    if (itemId) body.itemId = itemId;
    const result = await this.post<{ accessToken?: string }>('/connect_token', body);
    if (!result.accessToken) {
      throw new ServiceUnavailableException('Pluggy returned no accessToken');
    }
    return result.accessToken;
  }

  /** Single-item read. Unlike listing items, this is available on every plan. */
  fetchItem(itemId: string): Promise<PluggyItem> {
    return this.get<PluggyItem>(`/items/${itemId}`);
  }

  async fetchAccounts(itemId: string): Promise<PluggyAccount[]> {
    const page = await this.get<{ results: PluggyAccount[] }>(`/accounts?itemId=${itemId}`);
    return page.results ?? [];
  }

  async fetchInvestments(itemId: string): Promise<PluggyInvestment[]> {
    const page = await this.get<{ results: PluggyInvestment[] }>(`/investments?itemId=${itemId}`);
    return page.results ?? [];
  }

  /**
   * Walks /v2/transactions by cursor until exhausted.
   *
   * v1 /transactions is page-based but returns HTTP 410 for applications created after
   * 2026-06-02, so v2 is the only option for a new Pluggy app.
   */
  async fetchTransactions(accountId: string, dateFrom: string): Promise<PluggyTransaction[]> {
    const all: PluggyTransaction[] = [];
    // No pageSize here: it is a v1 parameter and /v2/transactions rejects it with HTTP 400.
    // The cursor endpoint sets its own page size and hands back `next` until exhausted.
    let path = `/v2/transactions?accountId=${accountId}&dateFrom=${dateFrom}`;

    // Guard against a malformed cursor looping forever.
    for (let page = 0; page < 200; page += 1) {
      const body = await this.get<CursorPage<PluggyTransaction>>(path);
      all.push(...(body.results ?? []));
      if (!body.next) return all;
      path = `/v2/transactions${body.next}`;
    }

    this.logger.warn(`Stopped paginating account ${accountId} after 200 pages`);
    return all;
  }
}
