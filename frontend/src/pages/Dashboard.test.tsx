import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './Dashboard';

vi.mock('lucide-react', () => ({
  Bell: () => <div data-testid="icon-bell" />,
  User: () => <div data-testid="icon-user" />,
  LogOut: () => <div data-testid="icon-logout" />,
  LayoutDashboard: () => <div data-testid="icon-layout" />,
  Settings: () => <div data-testid="icon-settings" />,
  MessageSquare: () => <div data-testid="icon-message" />,
  BarChart: () => <div data-testid="icon-barchart" />,
  Calendar: () => <div data-testid="icon-calendar" />,
  Menu: () => <div data-testid="icon-menu" />,
  Loader: () => <div data-testid="icon-loader" />
}));

describe('Dashboard Component Integrity', () => {
  it('renders side navigation and top bar safely', () => {
    // Mock user locally for consistent render
    localStorage.setItem('user', JSON.stringify({ username: "vitest_user" }));
    
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getByText(/Logout/i)).toBeInTheDocument();
  });
});
