/**
 * GET /api/v1/docs — Serves OpenAPI spec as JSON.
 * Public endpoint (no auth required).
 */

import { NextResponse } from 'next/server';
import spec from '../openapi.json';

export async function GET() {
  return NextResponse.json(spec, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
