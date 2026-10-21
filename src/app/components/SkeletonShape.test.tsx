// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import SkeletonShape, { imageSkeletonShape } from './SkeletonShape';
import ContentSkeleton from './ContentSkeleton';
import { StudyArt } from './library/StudyArt';

it('maps actual official logos and the account mascot to their traced silhouettes', () => {
  expect(imageSkeletonShape('/images/exams/jamb.png')).toBe('jamb');
  expect(imageSkeletonShape('/images/exams/waec.png?v=2')).toBe('waec');
  expect(imageSkeletonShape('/pets/scholar/67.webp')).toBe('scholar-account');
  expect(imageSkeletonShape('/a-question-diagram.png')).toBeNull();
  const host = document.createElement('div'); host.innerHTML = renderToStaticMarkup(<SkeletonShape shape="scholar-wave" />);
  expect(host.querySelector('svg')?.getAttribute('viewBox')).toBe('42 0 108 208');
  expect(host.querySelector('path')!.getAttribute('d')!.length).toBeGreaterThan(500);
  expect(host.querySelector('img')).toBeNull();
});
it('uses the same category paths for loading as for the real artwork', () => {
  const host = document.createElement('div'); host.innerHTML = renderToStaticMarkup(<ContentSkeleton kind="catalog" />);
  const icons = [...host.querySelectorAll('svg.study-art')]; expect(icons).toHaveLength(3);
  ['institution', 'exam_board', 'professional_body'].forEach((type, index) => {
    const source = document.createElement('div'); source.innerHTML = renderToStaticMarkup(<StudyArt type={type} />);
    expect([...icons[index].querySelectorAll('path')].map(path => path.getAttribute('d'))).toEqual([...source.querySelectorAll('path')].map(path => path.getAttribute('d')));
  });
});
