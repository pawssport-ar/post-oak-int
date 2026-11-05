import 'reflect-metadata';
import { RequestMethod, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Payment } from '@post-oak/contracts';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

const payment = (amount: number, rail: 'ach' | 'wire' = 'wire') => ({
  fromAccountId: 'acc_operating',
  destination: { type: 'recipient', recipientId: 'rcp_carrier_1' },
  rail,
  amount,
});

describe('payments API', () => {
  let app: INestApplication;
  let sequence = 0;

  /** A fresh, isolated sandbox for each scenario. */
  const sandbox = () => {
    sequence += 1;
    const id = `e2e-sandbox-${sequence}`;
    const http = request(app.getHttpServer());
    return {
      get: (path: string) => http.get(`/v1${path}`).set('x-sandbox-id', id),
      post: (path: string, body?: object) =>
        http
          .post(`/v1${path}`)
          .set('x-sandbox-id', id)
          .send(body ?? {}),
      actAs: (userId: string) =>
        http.post('/v1/session/persona').set('x-sandbox-id', id).send({ userId }).expect(200),
    };
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('v1', { exclude: [{ path: 'health', method: RequestMethod.GET }] });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers the health probe without a sandbox', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body.status).toBe('ok');
  });

  it('holds large wires for approval and moves nothing yet', async () => {
    const api = sandbox();
    const { body: before } = await api.get('/accounts/acc_operating');

    const { body: created } = await api.post('/payments', payment(5_000_000)).expect(201);

    expect((created as Payment).status).toBe('pending_approval');
    const { body: after } = await api.get('/accounts/acc_operating');
    expect(after.available).toBe(before.available);
  });

  it('never lets the creator approve their own payment', async () => {
    const api = sandbox();
    const { body: created } = await api.post('/payments', payment(5_000_000));

    const response = await api.post(`/payments/${created.id}/approve`).expect(403);

    expect(response.body.detail).toContain('second person');
    expect(response.type).toBe('application/problem+json');
  });

  it('releases the payment once someone else approves it', async () => {
    const api = sandbox();
    const { body: created } = await api.post('/payments', payment(5_000_000));

    await api.actAs('usr_marcus');
    const { body: approved } = await api.post(`/payments/${created.id}/approve`).expect(200);

    expect(approved.status).toBe('processing');
    const { body: account } = await api.get('/accounts/acc_operating');
    expect(account.pending).toBeLessThan(0);
  });

  it('enforces roles on the server, not only in the interface', async () => {
    const api = sandbox();
    await api.actAs('usr_priya');
    await api.post('/payments/pay_meridian/approve').expect(403);

    await api.actAs('usr_hannah');
    await api.get('/accounts').expect(403);
  });

  it('replays the original response for a repeated idempotency key', async () => {
    const api = sandbox();
    const send = () =>
      api.post('/payments', payment(120_000, 'ach')).set('idempotency-key', 'retry-1');

    const first = await send().expect(201);
    const second = await send().expect(201);

    expect(second.body.id).toBe(first.body.id);
    const { body: payments } = await api.get('/payments');
    expect(payments.filter((p: Payment) => p.id === first.body.id)).toHaveLength(1);
  });

  it('refuses a payment the account cannot cover', async () => {
    const api = sandbox();
    const response = await api.post('/payments', payment(99_000_000_000)).expect(422);
    expect(response.body.code).toBe('insufficient_funds');
  });

  it('rejects invalid input with field-level detail', async () => {
    const api = sandbox();
    const response = await api.post('/payments', { ...payment(-5) }).expect(400);
    expect(response.body.code).toBe('validation_failed');
    expect(response.body.fields.amount).toBeDefined();
  });

  it('isolates sandboxes from each other', async () => {
    const first = sandbox();
    const second = sandbox();

    await first.post('/payments', payment(5_000_000)).expect(201);

    const { body: mine } = await first.get('/payments');
    const { body: theirs } = await second.get('/payments');
    expect(mine.length).toBe(theirs.length + 1);
  });

  it('filters and summarises the ledger', async () => {
    const api = sandbox();
    const { body } = await api.get('/transactions?category=fuel&direction=out&pageSize=5');

    expect(body.items).toHaveLength(5);
    expect(body.items.every((t: { category: string }) => t.category === 'fuel')).toBe(true);
    expect(body.summary.outflow).toBeGreaterThan(0);
    expect(body.summary.inflow).toBe(0);
  });
});
