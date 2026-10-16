import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('../../../services/reminders', () => ({ getReminders: vi.fn(), saveReminders: vi.fn(), enableReminders: vi.fn(), testReminder: vi.fn(), currentDeviceId: vi.fn(), notificationSupport: vi.fn(), deviceTimezone: vi.fn(), syncStudyHistory: vi.fn() }));
import { PreferencesScreen } from './PreferencesScreen';
const props = { ownerId: 'student-a', name: 'Ada Okafor', email: 'ada@example.test', avatar: '', theme: 'system' as const, onTheme: vi.fn(), onReminders: vi.fn(), onProgress: vi.fn() };
describe('student preferences', () => {
  it('uses real session outcomes for the graph and statistics', () => {
    const html = renderToStaticMarkup(<PreferencesScreen {...props} sessions={[{ score: 7, total_questions: 10, completed_at: '2026-10-15T12:00:00Z' }, { score: 8, total_questions: 10, completed_at: '2026-10-16T12:00:00Z' }]} />);
    expect(html).toContain('75%'); expect(html).toContain('80%'); expect(html).toContain('Latest score 80 percent');
    expect(html).toContain('Theme'); expect(html).toContain('Study reminders'); expect(html).not.toMatch(/Sign [Oo]ut|FAQ|About PastQ|Preparing for|Study guide/); expect(html).not.toContain('radiogroup');
  });
  it('does not invent a score or progress curve for a new student', () => {
    const html = renderToStaticMarkup(<PreferencesScreen {...props} sessions={[]} />);
    expect(html).toContain('Complete a session'); expect(html).not.toContain('Latest score'); expect(html).not.toContain('85%');
  });
});
