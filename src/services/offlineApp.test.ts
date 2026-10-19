// @vitest-environment jsdom
import {beforeEach,describe,it,expect,vi} from 'vitest';
import {rememberOfflineOwner,offlineOwner} from './offlineApp';
beforeEach(()=>{localStorage.clear();vi.restoreAllMocks();vi.spyOn(navigator,'onLine','get').mockReturnValue(false)});
describe('offline identity',()=>{
 it('restores only the last signed-in owner without copying tokens',()=>{
  rememberOfflineOwner({id:'ada',email:'ada@test',access_token:'secret',user_metadata:{full_name:'Ada',study_preferences:{complete:true},secret:'hidden'}});
  expect(offlineOwner()).toMatchObject({id:'ada',offline:true});expect(localStorage.getItem('pastq-offline-owner-v1')).not.toContain('secret');
  rememberOfflineOwner({id:'ben',user_metadata:{full_name:'Ben'}});expect(offlineOwner()?.id).toBe('ben');
 });
 it('clears offline access on explicit sign-out and does not override online authentication',()=>{rememberOfflineOwner({id:'ada'});vi.spyOn(navigator,'onLine','get').mockReturnValue(true);expect(offlineOwner()).toBeNull();vi.spyOn(navigator,'onLine','get').mockReturnValue(false);rememberOfflineOwner(null);expect(offlineOwner()).toBeNull()});
});
