import { describe, expect, it, vi } from 'vitest';
import { parseNeonSchedule } from '../neon/schedule';
import { hostingServices } from '../src/hosting/services';
import { israelSlot } from '../src/notifications';
const at='2026-11-14T21:00:00.000Z';
const body={version:1,invocation_id:'inv-1',trigger:{type:'schedule',id:'trigger-1',name:'inventory'},data:{scheduled_at:at}};
const headers=new Headers({'x-neon-trigger-invocation-id':'inv-1'});
describe('real Neon trigger parser and schedule boundary',()=>{
 it('requires provider header, consistent ID, known trigger and valid schedule body',()=>{
  expect(parseNeonSchedule(headers,body,'trigger-1')).toBe(Date.parse(at));
  expect(parseNeonSchedule(new Headers(),body,'trigger-1')).toBeNull();
  expect(parseNeonSchedule(new Headers({'x-neon-trigger-invocation-id':'forged'}),body,'trigger-1')).toBeNull();
  expect(parseNeonSchedule(headers,body,'another-trigger')).toBeNull();expect(parseNeonSchedule(headers,body,undefined)).toBeNull();
  expect(parseNeonSchedule(headers,{...body,data:{scheduled_at:'not-a-date'}},'trigger-1')).toBeNull();
  expect(parseNeonSchedule(headers,{...body,trigger:{...body.trigger,type:'storage_object_created'}},'trigger-1')).toBeNull();
 });
 it('preserves Israel 23:00 in both winter and summer with UTC twenty-minute ticks',()=>{
  for(const instant of ['2026-01-10T21:00:00Z','2026-07-10T20:00:00Z']){
   const parsed=parseNeonSchedule(headers,{...body,data:{scheduled_at:instant}},'trigger-1');expect(israelSlot(new Date(parsed!))).toMatchObject({kind:'evening'});
  }
 });
 it('does no secret/database work on unused, stale or future ticks',async()=>{
  const service=hostingServices({});
  await expect(service.scheduled(Date.parse('2020-01-01T21:00:00Z'))).resolves.toBeUndefined();
  await expect(service.scheduled(Date.parse('2100-01-01T21:00:00Z'))).resolves.toBeUndefined();
  const clock=vi.spyOn(Date,'now').mockReturnValue(Date.parse('2026-11-14T12:20:00Z'));
  try { await expect(service.scheduled(Date.now())).resolves.toBeUndefined(); } finally { clock.mockRestore(); }
 });
});
