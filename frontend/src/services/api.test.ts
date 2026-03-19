import { describe, it, expect } from 'vitest';
import api from './api';

describe('API Client Configuration', () => {
  it('must use relative paths dynamically instead of hardcoded localhost vectors', () => {
    // Assert the default Axios instance was constructed with the relative route
    expect(api.defaults.baseURL).toEqual('/api');
  });
});
