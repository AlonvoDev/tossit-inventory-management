import { afterEach, describe, expect, it, vi } from 'vitest';
import { serverCallable } from '../../services/serverCalls';
const calls=vi.hoisted(()=>({legacy:vi.fn(),hosted:vi.fn(),invoke:vi.fn(async(input:unknown)=>({data:input}))}));
vi.mock('../../services/firebase',()=>({functions:{}}));
vi.mock('firebase/functions',()=>({httpsCallable:(...args:unknown[])=>{calls.legacy(...args);return calls.invoke;},httpsCallableFromURL:(...args:unknown[])=>{calls.hosted(...args);return calls.invoke;}}));
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
describe('explicit backend callable transport',()=>{
 it('routes a configured HTTPS base to the exact named endpoint and keeps SDK options/results',async()=>{
  vi.stubEnv('VITE_SERVER_API_URL','https://tossit.example/api/');
  const body={requestId:'same-intent'};expect(await serverCallable('createEmployee',{timeout:60000})(body)).toEqual({data:body});
  expect(calls.hosted).toHaveBeenCalledWith({},'https://tossit.example/api/createEmployee',{timeout:60000});expect(calls.legacy).not.toHaveBeenCalled();
 });
 it('fails closed for invalid configured URLs and never falls back to Google',async()=>{
  vi.stubEnv('VITE_USE_FIREBASE_EMULATORS','false');
  for(const base of ['   ','http://server.example','https://user:secret@server.example','https://server.example?x=1','https://server.example#fragment']){
   vi.stubEnv('VITE_SERVER_API_URL',base);await expect(serverCallable('createEmployee')({})).rejects.toMatchObject({code:'functions/unavailable'});
  }
  expect(calls.hosted).not.toHaveBeenCalled();expect(calls.legacy).not.toHaveBeenCalled();
 });
 it('permits HTTP only for explicitly selected local emulators',async()=>{
  vi.stubEnv('VITE_SERVER_API_URL','http://127.0.0.1:5001');vi.stubEnv('VITE_USE_FIREBASE_EMULATORS','true');
  await serverCallable('revokePushDevice')({});expect(calls.hosted).toHaveBeenCalled();
 });
 it('preserves the legacy adapter only when no external base is selected',async()=>{
  vi.stubEnv('VITE_SERVER_API_URL','');await serverCallable('updateEmployee')({});expect(calls.legacy).toHaveBeenCalledWith({},'updateEmployee',{timeout:10000});expect(calls.hosted).not.toHaveBeenCalled();
 });
 it('preserves callable errors including server/retry codes',async()=>{
  vi.stubEnv('VITE_SERVER_API_URL','https://tossit.example');calls.invoke.mockRejectedValueOnce(Object.assign(new Error('retry'),{code:'functions/aborted'}));
  await expect(serverCallable('createEmployee')({})).rejects.toMatchObject({code:'functions/aborted'});
 });
 it('rejects unrecognized endpoint names before any network call',async()=>{
  await expect(serverCallable('promoteMe' as 'createEmployee')({})).rejects.toMatchObject({code:'functions/invalid-argument'});expect(calls.hosted).not.toHaveBeenCalled();expect(calls.legacy).not.toHaveBeenCalled();
 });
});
