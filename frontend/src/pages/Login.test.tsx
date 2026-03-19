import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';
import { GoogleOAuthProvider } from '@react-oauth/google';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ login: vi.fn(), register: vi.fn(), user: null })
}));

describe('Login Component Integrity', () => {
  it('renders the login form and oauth button safely', () => {
    render(
      <GoogleOAuthProvider clientId="test_client_id">
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </GoogleOAuthProvider>
    );

    // Validate main headers and buttons exist
    expect(screen.getByText(/Sign in to Socioboard/i)).toBeInTheDocument();
    
    // Check if the submit button exists
    const button = screen.getByRole('button', { name: /Sign in$/i });
    expect(button).toBeInTheDocument();
  });
});
