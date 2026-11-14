import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHttpHandler } from '../src/hosting/http';
const origin = 'https://tossit-inventory-management.onrender.com';
const auth = vi.fn(async (token: string) => { if (token !== 'valid') throw new Error('private token detail'); return 'admin'; });
const call = vi.fn(async (_name: string, _data: unknown, uid: string | null) => ({ uid }));
const scheduled = vi.fn<(at: number) => Promise<void>>(async () => {});
const handler = () => createHttpHandler({ allowedOrigins: [origin], authenticate: auth, call, scheduled,
  ready: () => false, parseTrigger: (headers, body) => headers.get('x-neon-trigger-invocation-id') === 'trusted' && (body as { at?: number })?.at ? (body as {at:number}).at : null });
function request(path = '/createEmployee', body: unknown = { data: { fullName: 'A' } }, headers: Record<string,string> = {}) {
 return new Request('https://server.example'+path, { method: 'POST', headers: { 'content-type':'application/json', origin, ...headers }, body: JSON.stringify(body) });
}
beforeEach(() => { vi.clearAllMocks(); });
describe('callable HTTP boundary', () => {
 it('serves health without initializing credentials or exposing errors', async () => {
  const r=await handler()(new Request('https://server.example/health')); expect(r.status).toBe(200);
  expect(await r.json()).toEqual({ service:'tossit-server',configured:false }); expect(auth).not.toHaveBeenCalled();expect(call).not.toHaveBeenCalled();
 });
 it('requires verified identity and rejects invalid supplied tokens even for capability cleanup', async () => {
  expect((await handler()(request())).status).toBe(401);
  expect((await handler()(request('/revokePushDevice', {data:{}}, {authorization:'Bearer forged'}))).status).toBe(401);
  expect((await handler()(request('/createEmployee', {data:{}}, {authorization:'Basic valid'}))).status).toBe(401);
  expect(call).not.toHaveBeenCalled();
 });
 it('passes only verified uid and exact data to services with real callable result shape', async () => {
  const r=await handler()(request('/createEmployee',{data:{uid:'forged'}},{authorization:'Bearer valid'}));
  expect(await r.json()).toEqual({ result:{uid:'admin'} });expect(call).toHaveBeenCalledWith('createEmployee',{uid:'forged'},'admin');
  expect(r.headers.get('access-control-allow-origin')).toBe(origin);
 });
 it('allows signed-out capability revoke only on that route', async () => {
  expect((await handler()(request('/revokePushDevice',{data:{deviceToken:'cap'}}))).status).toBe(200);
  expect(call).toHaveBeenCalledWith('revokePushDevice',{deviceToken:'cap'},null);
 });
 it('retains typed errors but sanitizes unexpected failures', async () => {
  call.mockRejectedValueOnce(Object.assign(new Error('Denied'),{code:'permission-denied'}));
  const denied=await handler()(request('/createEmployee',{data:{}},{authorization:'Bearer valid'}));
  expect(denied.status).toBe(403);expect(await denied.json()).toEqual({error:{status:'PERMISSION_DENIED',message:'Operation is not permitted'}});
  call.mockRejectedValueOnce(new Error('secret credential stack'));
  const failed=await handler()(request('/createEmployee',{data:{}},{authorization:'Bearer valid'}));expect(failed.status).toBe(500);
  expect(JSON.stringify(await failed.json())).not.toContain('secret');
 });
 it('rejects bad origins, methods, types and malformed callable envelopes before calling a service', async () => {
  const h=handler();expect((await h(request('/createEmployee',{data:{}},{origin:'https://evil.test'}))).status).toBe(403);
  expect((await h(new Request('https://server.example/createEmployee'))).status).toBe(405);
  expect((await h(request('/unknown'))).status).toBe(404);
  for(const body of [{uid:'x'},{data:{},extra:true},null,[]])expect((await h(request('/createEmployee',body,{authorization:'Bearer valid'}))).status).toBe(400);
  expect((await h(request('/createEmployee',{data:{}},{'content-type':'text/plain',authorization:'Bearer valid'}))).status).toBe(400);
  expect(call).not.toHaveBeenCalled();
 });
 it('handles legitimate preflight and rejects forbidden requested methods or headers', async () => {
  const options=(headers:Record<string,string>)=>new Request('https://server.example/createEmployee',{method:'OPTIONS',headers:{origin,...headers}});
  expect((await handler()(options({'access-control-request-method':'POST','access-control-request-headers':'authorization, content-type'}))).status).toBe(204);
  expect((await handler()(options({'access-control-request-method':'DELETE'}))).status).toBe(403);
  expect((await handler()(options({'access-control-request-method':'POST','access-control-request-headers':'x-secret'}))).status).toBe(403);
 });
 it('caps declared and actual body bytes including chunked streams', async () => {
  const h=handler();expect((await h(request('/createEmployee',{data:{}},{'content-length':'999999',authorization:'Bearer valid'}))).status).toBe(413);
  const r=new Request('https://server.example/createEmployee',{method:'POST',headers:{origin,'content-type':'application/json',authorization:'Bearer valid'},body:new ReadableStream({start(c){c.enqueue(new Uint8Array(33000));c.close();}}),duplex:'half'} as RequestInit);
  expect((await h(r)).status).toBe(413);expect(call).not.toHaveBeenCalled();
 });
 it('rejects spoofed schedules and passes authenticated occurrence time without a user token', async () => {
  expect((await handler()(request('/scheduled',{at:123}))).status).toBe(401);expect(scheduled).not.toHaveBeenCalled();
  const r=await handler()(request('/scheduled',{at:123},{'x-neon-trigger-invocation-id':'trusted'}));expect(r.status).toBe(200);expect(scheduled).toHaveBeenCalledWith(123);
 });
});
