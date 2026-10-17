// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { sourceHtmlFragment } from './sourceHtml';

const image = 'data:image/png;base64,iVBORw0KGgo=';
function render(html: string) { const el = document.createElement('div'); el.append(sourceHtmlFragment(html)); return el; }

describe('original question formatting', () => {
  it('keeps tables, embedded illustrations, emphasis and native equations offline', () => {
    const el = render(`<div><strong>Use this diagram</strong><img src="${image}" alt="Circuit"><table><tr><td rowspan="2">12</td><td>7</td></tr></table><math><mfrac><mn>22</mn><mn>7</mn></mfrac></math></div>`);
    expect(el.querySelector('img')?.getAttribute('src')).toBe(image);
    expect(el.querySelector('td')?.getAttribute('rowspan')).toBe('2');
    expect(el.querySelector('mfrac')?.namespaceURI).toBe('http://www.w3.org/1998/Math/MathML');
    expect(el.querySelector('strong')?.textContent).toBe('Use this diagram');
  });
  it('strips executable markup, external images, injected styles and global classes', () => {
    const el = render(`<script>alert(1)</script><iframe src="https://bad.test"></iframe><svg onload="alert(1)"><script>alert(1)</script></svg><div class="study-app" onclick="alert(1)" style="position:fixed;display:none;background:url(https://bad.test);text-align:center"><img src="https://bad.test/track"><img src="data:image/svg+xml;base64,abc"><a href="javascript:alert(1)">Answer</a><img src="${image}" onerror="alert(1)"></div>`);
    expect(el.querySelectorAll('script,iframe,svg,a,[onclick],[onerror],[class]')).toHaveLength(0);
    expect(el.querySelectorAll('img')).toHaveLength(1);
    expect(el.innerHTML).not.toMatch(/bad\.test|javascript:|position:|display:|background:/);
    expect(el.querySelector('div')?.style.textAlign).toBe('center');
    expect(el.textContent).toBe('Answer');
  });
  it('keeps the source superscript and fraction layout without app-level positioning', () => {
    const el = render('<span style="position:relative;top:-7px;left:3px;font-family:Other">1</span>/<span style="position:relative;top:7px">2</span>');
    expect(el.querySelector('span')?.style.top).toBe('-7px');
    expect(el.querySelector('span')?.style.fontFamily).toBe('');
  });
});
