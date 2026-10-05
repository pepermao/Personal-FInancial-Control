import { Injectable, Logger } from '@nestjs/common';

const SGS_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.{code}/dados/ultimos/{n}?formato=json';

/**
 * Banco Central SGS series. Codes were verified against live responses rather than
 * documentation, because published lists contradict each other:
 *
 *   1178  Selic, effective, annualised (base 252)
 *   4389  CDI, annualised (base 252)
 *    433  IPCA, monthly change (%)
 *
 * Series 11 is the Selic *daily* rate (~0.05 %/day). Treating it as annual understates the
 * benchmark by more than two orders of magnitude, so it is deliberately not used.
 */
const SELIC_ANNUAL = 1178;
const CDI_ANNUAL = 4389;
const IPCA_MONTHLY = 433;

/** Rates move once a day at most; a long cache keeps agent chatter off the BCB API. */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const TIMEOUT_MS = 15_000;

export interface Benchmarks {
  selicAnnual: number | null;
  cdiAnnual: number | null;
  ipca12m: number | null;
  /** CDI discounted by inflation — what the money actually earns. */
  realRatePct: number | null;
  asOf: string | null;
  source: string;
  available: boolean;
}

@Injectable()
export class BenchmarksService {
  private readonly logger = new Logger(BenchmarksService.name);
  private cache: { value: Benchmarks; at: number } | null = null;

  async get(): Promise<Benchmarks> {
    if (this.cache && Date.now() - this.cache.at < CACHE_TTL_MS) return this.cache.value;

    const [selic, cdi, ipca12m] = await Promise.all([
      this.latest(SELIC_ANNUAL),
      this.latest(CDI_ANNUAL),
      this.compound12m(IPCA_MONTHLY),
    ]);

    const realRatePct =
      cdi.value !== null && ipca12m !== null
        ? Number((((1 + cdi.value / 100) / (1 + ipca12m / 100) - 1) * 100).toFixed(2))
        : null;

    const value: Benchmarks = {
      selicAnnual: selic.value,
      cdiAnnual: cdi.value,
      ipca12m,
      realRatePct,
      asOf: cdi.date ?? selic.date,
      source: 'Banco Central SGS',
      available: cdi.value !== null,
    };

    this.cache = { value, at: Date.now() };
    return value;
  }

  private async fetchSeries(code: number, n: number): Promise<Array<{ data: string; valor: string }>> {
    try {
      const response = await fetch(SGS_URL.replace('{code}', String(code)).replace('{n}', String(n)), {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) return [];
      // SGS answers with an HTML error page when it rate-limits, so this can throw.
      const body = await response.json();
      return Array.isArray(body) ? body : [];
    } catch {
      this.logger.warn(`Banco Central series ${code} unavailable`);
      return [];
    }
  }

  private async latest(code: number): Promise<{ value: number | null; date: string | null }> {
    const series = await this.fetchSeries(code, 1);
    const point = series.at(-1);
    if (!point) return { value: null, date: null };
    const value = Number(point.valor);
    return Number.isFinite(value) ? { value, date: point.data } : { value: null, date: null };
  }

  /** Compounds the last 12 monthly readings into an annual percentage. */
  private async compound12m(code: number): Promise<number | null> {
    const series = await this.fetchSeries(code, 12);
    if (series.length < 12) return null;

    let factor = 1;
    for (const point of series) {
      const value = Number(point.valor);
      if (!Number.isFinite(value)) return null;
      factor *= 1 + value / 100;
    }
    return Number(((factor - 1) * 100).toFixed(2));
  }
}
