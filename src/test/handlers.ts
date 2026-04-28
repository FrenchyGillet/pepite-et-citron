/**
 * Base MSW handlers for Supabase endpoints.
 *
 * These are the persistent, default handlers loaded into setupServer().
 * They return safe, empty-state responses so any test that doesn't
 * explicitly need specific data won't see "unhandled request" warnings.
 *
 * Individual tests override specific endpoints with server.use() —
 * MSW gives per-test handlers priority over these base handlers.
 * server.resetHandlers() in afterEach() restores these defaults.
 */

import { http, HttpResponse } from 'msw';

export const BASE = 'https://VOTRE_PROJET.supabase.co/rest/v1';
export const AUTH = 'https://VOTRE_PROJET.supabase.co/auth/v1';
export const RPC  = `${BASE}/rpc`;

export const handlers = [

  // ── Players ────────────────────────────────────────────────────────────────
  http.get   (`${BASE}/players`, () => HttpResponse.json([])),
  http.post  (`${BASE}/players`, () => HttpResponse.json([])),
  http.patch (`${BASE}/players`, () => new HttpResponse(null, { status: 204 })),
  http.delete(`${BASE}/players`, () => new HttpResponse(null, { status: 204 })),

  // ── Matches ────────────────────────────────────────────────────────────────
  http.get   (`${BASE}/matches`, () => HttpResponse.json([])),
  http.post  (`${BASE}/matches`, () => HttpResponse.json([])),
  http.patch (`${BASE}/matches`, () => HttpResponse.json([])),
  http.delete(`${BASE}/matches`, () => new HttpResponse(null, { status: 204 })),

  // ── Votes ──────────────────────────────────────────────────────────────────
  http.get   (`${BASE}/votes`, () => HttpResponse.json([])),
  http.post  (`${BASE}/votes`, () => HttpResponse.json([])),
  http.delete(`${BASE}/votes`, () => new HttpResponse(null, { status: 204 })),

  // ── Teams ──────────────────────────────────────────────────────────────────
  http.get   (`${BASE}/teams`, () => HttpResponse.json([])),
  http.post  (`${BASE}/teams`, () => HttpResponse.json([])),
  http.patch (`${BASE}/teams`, () => new HttpResponse(null, { status: 204 })),
  http.delete(`${BASE}/teams`, () => new HttpResponse(null, { status: 204 })),

  // ── Guest tokens ───────────────────────────────────────────────────────────
  http.get   (`${BASE}/guest_tokens`, () => HttpResponse.json([])),
  http.post  (`${BASE}/guest_tokens`, () => HttpResponse.json([])),
  http.patch (`${BASE}/guest_tokens`, () => HttpResponse.json([])),
  http.delete(`${BASE}/guest_tokens`, () => new HttpResponse(null, { status: 204 })),

  // ── Organizations ──────────────────────────────────────────────────────────
  http.get   (`${BASE}/organizations`, () => HttpResponse.json([])),
  http.post  (`${BASE}/organizations`, () => HttpResponse.json([])),
  http.patch (`${BASE}/organizations`, () => HttpResponse.json([])),

  // ── Org members ────────────────────────────────────────────────────────────
  http.get   (`${BASE}/org_members`, () => HttpResponse.json([])),
  http.delete(`${BASE}/org_members`, () => new HttpResponse(null, { status: 204 })),

  // ── Settings (season name / season counter) ────────────────────────────────
  http.get   (`${BASE}/settings`, () => HttpResponse.json([])),
  http.post  (`${BASE}/settings`, () => HttpResponse.json([])),
  http.patch (`${BASE}/settings`, () => HttpResponse.json([])),

  // ── Auth ───────────────────────────────────────────────────────────────────
  http.post(`${AUTH}/signup`, () =>
    HttpResponse.json({ user: null, session: null }),
  ),
  http.post(`${AUTH}/token`, () =>
    HttpResponse.json({ user: null, session: null }),
  ),
  http.post(`${AUTH}/logout`, () => new HttpResponse(null, { status: 204 })),
  http.get (`${AUTH}/user`,   () => HttpResponse.json(null)),

  // ── Supabase RPC functions ─────────────────────────────────────────────────
  http.post(`${RPC}/create_organization`, () => HttpResponse.json(null)),
  http.post(`${RPC}/get_my_orgs`,         () => HttpResponse.json([])),
  http.post(`${RPC}/get_org_members`,     () => HttpResponse.json([])),
  http.post(`${RPC}/add_org_member`,      () => HttpResponse.json(null)),
];
