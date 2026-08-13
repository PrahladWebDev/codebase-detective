const { validateGithubUrl, GithubValidationError } = require('../githubCloner');

describe('validateGithubUrl', () => {
  it('accepts a plain owner/repo URL', () => {
    const result = validateGithubUrl('https://github.com/facebook/react');
    expect(result).toEqual({
      owner: 'facebook',
      repo: 'react',
      cloneUrl: 'https://github.com/facebook/react.git',
      displayName: 'facebook/react',
    });
  });

  it('accepts a URL with a trailing .git', () => {
    const result = validateGithubUrl('https://github.com/facebook/react.git');
    expect(result.cloneUrl).toBe('https://github.com/facebook/react.git');
  });

  it('accepts a URL with a trailing slash', () => {
    const result = validateGithubUrl('https://github.com/facebook/react/');
    expect(result.repo).toBe('react');
  });

  it('rejects empty or non-string input', () => {
    expect(() => validateGithubUrl('')).toThrow(GithubValidationError);
    expect(() => validateGithubUrl(undefined)).toThrow(GithubValidationError);
    expect(() => validateGithubUrl(null)).toThrow(GithubValidationError);
  });

  it('rejects non-URL garbage', () => {
    expect(() => validateGithubUrl('not a url at all')).toThrow(GithubValidationError);
  });

  it('rejects non-https protocols', () => {
    expect(() => validateGithubUrl('http://github.com/facebook/react')).toThrow(GithubValidationError);
    expect(() => validateGithubUrl('git@github.com:facebook/react.git')).toThrow(GithubValidationError);
    expect(() => validateGithubUrl('ssh://git@github.com/facebook/react.git')).toThrow(GithubValidationError);
    expect(() => validateGithubUrl('file:///etc/passwd')).toThrow(GithubValidationError);
  });

  it('rejects hosts other than github.com', () => {
    expect(() => validateGithubUrl('https://gitlab.com/facebook/react')).toThrow(GithubValidationError);
    expect(() => validateGithubUrl('https://evil.com/github.com/facebook/react')).toThrow(GithubValidationError);
    expect(() => validateGithubUrl('https://github.com.evil.com/facebook/react')).toThrow(GithubValidationError);
  });

  it('rejects a URL missing the repo segment', () => {
    expect(() => validateGithubUrl('https://github.com/facebook')).toThrow(GithubValidationError);
    expect(() => validateGithubUrl('https://github.com/')).toThrow(GithubValidationError);
  });

  it('rejects URLs with extra path segments (e.g. /tree/branch)', () => {
    expect(() => validateGithubUrl('https://github.com/facebook/react/tree/main')).toThrow(GithubValidationError);
  });

  it('ignores query strings and fragments rather than treating them as part of the repo path', () => {
    // Not a security concern (only pathname is parsed), but should still
    // resolve to the same clean owner/repo rather than erroring oddly.
    const result = validateGithubUrl('https://github.com/facebook/react?tab=readme');
    expect(result.displayName).toBe('facebook/react');
  });

  it('rejects strings that look like git/CLI flags instead of a repo name', () => {
    // Would be dangerous if ever handed to a shell or as a bare git arg.
    expect(() => validateGithubUrl('https://github.com/--upload-pack=x/y')).toThrow(GithubValidationError);
    expect(() => validateGithubUrl('https://github.com/foo/--exec=x')).toThrow(GithubValidationError);
  });

  it('rejects an excessively long URL', () => {
    const long = 'https://github.com/' + 'a'.repeat(400) + '/repo';
    expect(() => validateGithubUrl(long)).toThrow(GithubValidationError);
  });
});
