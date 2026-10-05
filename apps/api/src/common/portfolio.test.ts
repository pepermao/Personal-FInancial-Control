import { describe, expect, it } from 'vitest';
import { AssetType } from '@ledger/shared';
import { issuerExposure, upcomingMaturities } from './portfolio';

describe('issuerExposure', () => {
  it('sums FGC-covered products per issuer and reports the uninsured excess', () => {
    const rows = issuerExposure([
      { type: AssetType.CDB, value: '200000', issuer: 'Banco X' },
      { type: AssetType.LCI, value: '100000', issuer: 'Banco X' },
    ]);
    expect(rows[0].fgcCovered).toBe(300000);
    expect(rows[0].uninsuredExcess).toBe(50000);
    expect(rows[0].headroom).toBe(0);
  });

  it('counts treasury bonds as exposure but never as FGC-covered', () => {
    const [row] = issuerExposure([
      { type: AssetType.TESOURO_SELIC, value: '500000', issuer: 'Tesouro Nacional' },
    ]);
    expect(row.value).toBe(500000);
    expect(row.fgcCovered).toBe(0);
    expect(row.uninsuredExcess).toBe(0);
    // Not 250000: the Treasury issues nothing FGC-covered, so "headroom" would mislead.
    expect(row.headroom).toBeNull();
  });

  it('reports headroom below the limit', () => {
    const [row] = issuerExposure([{ type: AssetType.CDB, value: '100000', issuer: 'Banco Y' }]);
    expect(row.headroom).toBe(150000);
  });

  it('keeps assets with no issuer visible rather than dropping them', () => {
    const rows = issuerExposure([
      { type: AssetType.ACOES, value: '1000', issuer: null },
      { type: AssetType.CDB, value: '1000', issuer: 'Banco X' },
    ]);
    const unknown = rows.find((row) => row.issuer === 'Desconhecido');
    expect(unknown?.sharePct).toBe(50);
  });
});

describe('upcomingMaturities', () => {
  const today = new Date('2026-01-01T12:00:00Z');

  it('returns only holdings inside the horizon, soonest first', () => {
    const rows = upcomingMaturities(
      [
        { name: 'later', type: AssetType.CDB, value: '1', dueDate: new Date('2026-06-01T00:00:00Z') },
        { name: 'soon', type: AssetType.CDB, value: '1', dueDate: new Date('2026-03-01T00:00:00Z') },
        { name: 'beyond', type: AssetType.CDB, value: '1', dueDate: new Date('2030-01-01T00:00:00Z') },
        { name: 'matured', type: AssetType.CDB, value: '1', dueDate: new Date('2025-01-01T00:00:00Z') },
      ],
      today,
    );
    expect(rows.map((row) => row.name)).toEqual(['soon', 'later']);
    expect(rows[0].daysUntil).toBe(59);
  });

  it('ignores holdings with no maturity', () => {
    expect(upcomingMaturities([{ name: 'x', type: AssetType.ACOES, value: '1' }], today)).toEqual([]);
  });
});
