// @vitest-environment jsdom
import {beforeEach,describe,it,expect,vi} from 'vitest';
const state=vi.hoisted(()=>({owner:'ada'}));
vi.mock('./supabase',()=>({supabase:{auth:{getSession:async()=>({data:{session:{user:{id:state.owner},access_token:'private-token'}}})}}}));
vi.mock('./api',()=>({apiUrl:(path:string)=>'https://api.pastq.test'+path}));
import {protectedFigureUrl,protectedFigureData,preparePrivateMedia} from './protectedMedia';
const url='/api/library/figures/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/p000001-f1-abcdef123456.jpg';
beforeEach(()=>{state.owner='ada';vi.unstubAllGlobals();vi.stubGlobal('createImageBitmap',vi.fn(async()=>({width:1,height:1,close:vi.fn()})));vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,blob:async()=>new Blob(['image bytes'],{type:'image/jpeg'})})));});
describe('protected source diagrams',()=>{
 it('sends bearer authentication only to the first-party figure route',async()=>{const result=await protectedFigureData(url,'ada');expect(result).toMatch(/^data:image\/jpeg;base64,/);expect(fetch).toHaveBeenCalledWith('https://api.pastq.test'+url,expect.objectContaining({headers:{Authorization:'Bearer private-token'},cache:'no-store'}));expect(protectedFigureUrl('https://evil.test'+url)).toBeNull();expect(protectedFigureUrl(url+'?token=hidden')).toBeNull();});
 it('refuses another account before fetching',async()=>{await expect(protectedFigureData(url,'ben')).rejects.toThrow('owner account');expect(fetch).not.toHaveBeenCalled()});
 it('embeds original figure bytes across figures, answer HTML and choices with one request',async()=>{
  const original={id:'private',sourceSessionId:'private',ownerId:'ada',questions:[{figures:[{url}],answerHtml:`<img src="${url}">`,optionsHtml:[`<img src="${url}">`]}]};
  const result=await preparePrivateMedia(original);expect(result.questions[0].figures[0].url).toMatch(/^data:image\/jpeg/);expect(result.questions[0].answerHtml).toContain('data:image/jpeg');expect(result.questions[0].optionsHtml[0]).toContain('data:image/jpeg');expect(fetch).toHaveBeenCalledOnce();expect(original.questions[0].figures[0].url).toBe(url);
 });
 it('rejects failed and non-image figure responses instead of marking them ready',async()=>{vi.stubGlobal('fetch',vi.fn(async()=>({ok:false})));await expect(protectedFigureData(url,'ada')).rejects.toThrow('Could not load');vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,blob:async()=>new Blob(['html'],{type:'text/html'})})));await expect(protectedFigureData(url,'ada')).rejects.toThrow('Invalid diagram');});
});
