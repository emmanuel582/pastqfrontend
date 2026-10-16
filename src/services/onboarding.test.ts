import { beforeEach, describe, expect, it, vi } from 'vitest';
import { completeOnboarding, readStudyPreferences } from './onboarding';
import { supabase } from './supabase';
const { eq, update } = vi.hoisted(() => { const eq=vi.fn(); return {eq,update:vi.fn(()=>({eq}))}; });
vi.mock('./supabase', () => ({supabase:{auth:{updateUser:vi.fn()},from:vi.fn(()=>({update}))}}));
beforeEach(()=>{vi.clearAllMocks();eq.mockResolvedValue({error:null});vi.mocked(supabase.auth.updateUser).mockResolvedValue({data:{user:{id:'ada'}},error:null} as any);});
describe('account-owned study preferences',()=>{
 it('saves the explicit choice on the authenticated account',async()=>{
  const focus={kind:'school' as const,id:'unilag',name:'University of Lagos'};
  const preferences=await completeOnboarding(true,focus);
  expect(supabase.auth.updateUser).toHaveBeenCalledWith({data:{is_undergraduate:true,study_preferences:preferences}});
  expect(eq).toHaveBeenCalledWith('id','ada');expect(readStudyPreferences({study_preferences:preferences})).toMatchObject({undergraduate:true,focus});
 });
 it('does not mark onboarding complete after an account save fails',async()=>{
  vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({data:{user:null},error:Error('Offline')} as any);
  await expect(completeOnboarding(false,null)).rejects.toThrow('Offline');expect(supabase.from).not.toHaveBeenCalled();
 });
 it('accepts exploration but rejects an undergraduate without a school',async()=>{
  await expect(completeOnboarding(true,null)).rejects.toThrow('choose your university');
  expect(readStudyPreferences({study_preferences:{undergraduate:true,focus:null,completedAt:'2026-10-16'}})).toBeNull();
  expect(readStudyPreferences({study_preferences:{undergraduate:false,focus:null,completedAt:'2026-10-16'}})).toMatchObject({undergraduate:false,focus:null});
 });
});
