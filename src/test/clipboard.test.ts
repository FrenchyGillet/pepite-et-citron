import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { copyToClipboard } from '@/utils/clipboard';

// jsdom doesn't implement document.execCommand — provide a shared stub.
const execCommandMock = vi.fn().mockReturnValue(true);

describe('copyToClipboard', () => {
  beforeEach(() => {
    execCommandMock.mockClear();
    // Ensure execCommand exists on document before each test
    Object.defineProperty(document, 'execCommand', {
      value: execCommandMock,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore a clean clipboard mock so other test files are unaffected
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it('calls navigator.clipboard.writeText with the correct text', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    await copyToClipboard('https://example.com/?org=test');

    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledWith('https://example.com/?org=test');
    expect(execCommandMock).not.toHaveBeenCalled();
  });

  it('does NOT use execCommand when clipboard API succeeds', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    await copyToClipboard('any text');

    expect(execCommandMock).not.toHaveBeenCalled();
  });

  it('falls back to execCommand when clipboard.writeText rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    await copyToClipboard('https://example.com/?org=test');

    expect(writeText).toHaveBeenCalledOnce();
    expect(execCommandMock).toHaveBeenCalledWith('copy');
  });

  it('falls back to execCommand when clipboard API is not available', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });

    await copyToClipboard('https://example.com/?org=test');

    expect(execCommandMock).toHaveBeenCalledWith('copy');
  });

  it('passes the correct text through the textarea during fallback', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });

    // Capture the textarea that gets appended to the body
    const appendSpy = vi.spyOn(document.body, 'appendChild');

    await copyToClipboard('mon-texte-secret');

    const textarea = appendSpy.mock.calls[0]?.[0] as HTMLTextAreaElement;
    expect(textarea).toBeInstanceOf(HTMLTextAreaElement);
    expect(textarea.value).toBe('mon-texte-secret');
    expect(execCommandMock).toHaveBeenCalledWith('copy');
  });

  it('removes the temporary textarea from the DOM after fallback', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });

    const before = document.body.children.length;
    await copyToClipboard('cleanup test');
    expect(document.body.children.length).toBe(before);
  });
});
