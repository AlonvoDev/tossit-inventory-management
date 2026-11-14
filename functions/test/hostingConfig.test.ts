import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { readAdminConfig } from '../src/hosting/admin';
describe('server credential configuration',()=>{
 it('fails closed for missing/malformed or mismatched account credentials',()=>{
  for(const env of [{},{FIREBASE_SERVICE_ACCOUNT_JSON:'oops'},{TOSSIT_FIREBASE_PROJECT_ID:'tossit-4cc02',FIREBASE_SERVICE_ACCOUNT_JSON:JSON.stringify({project_id:'another',client_email:'x',private_key:'x'})}]) expect(()=>readAdminConfig(env)).toThrow();
 });
 it('accepts a valid dedicated service account only for its configured project',()=>{
  const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
  const account={type:'service_account',project_id:'tossit-4cc02',client_email:'tossit-server@tossit-4cc02.iam.gserviceaccount.com',private_key:privateKey.export({format:'pem',type:'pkcs8'}).toString()};
  expect(readAdminConfig({FIREBASE_SERVICE_ACCOUNT_JSON:JSON.stringify(account)})).toMatchObject({projectId:'tossit-4cc02',emulated:false,account:{clientEmail:account.client_email}});
 });
 it('allows only explicit demo project and loopback hosts for emulator mode',()=>{
  const valid={TOSSIT_SERVER_EMULATORS:'true',TOSSIT_FIREBASE_PROJECT_ID:'demo-tossit-auth',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080'};
  expect(readAdminConfig(valid)).toEqual({projectId:'demo-tossit-auth',emulated:true});
  expect(()=>readAdminConfig({...valid,TOSSIT_FIREBASE_PROJECT_ID:'tossit-4cc02'})).toThrow();
  expect(()=>readAdminConfig({...valid,FIRESTORE_EMULATOR_HOST:'remote:8080'})).toThrow();
  expect(()=>readAdminConfig({...valid,TOSSIT_SERVER_EMULATORS:'false'})).toThrow();
 });
});
