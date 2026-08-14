import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppLinks } from '../../components/AppLinks';

describe('AppLinks', () => {
  it('renders the heading and subheading', () => {
    render(<AppLinks />);
    expect(screen.getByText('Enjoying the games?')).toBeInTheDocument();
    expect(screen.getByText('Host your own LANcade parties')).toBeInTheDocument();
  });

  it('renders the heading as a heading element', () => {
    render(<AppLinks />);
    const heading = screen.getByText('Enjoying the games?');
    expect(heading.tagName).toBe('H2');
  });

  it('renders both store badge links with the right destinations', () => {
    render(<AppLinks />);
    const appStore = screen.getByLabelText('Download LANcade from the Apple App Store');
    const googlePlay = screen.getByLabelText('Get LANcade on Google Play');
    expect(appStore).toHaveAttribute('href', 'https://apps.apple.com/us/app/lancade-server/id6794334690');
    expect(googlePlay).toHaveAttribute('href', 'https://play.google.com/store/apps/details?id=com.lancade.app');
    expect(appStore).toHaveAttribute('target', '_blank');
    expect(googlePlay).toHaveAttribute('target', '_blank');
  });

  it('renders the repo and feedback links', () => {
    render(<AppLinks />);
    const links = screen.getAllByRole('link');
    const hrefs = links.map((link) => link.getAttribute('href'));
    expect(hrefs).toContain('https://github.com/ltmdum/LANcade');
    expect(hrefs).toContain('https://ltmdum.github.io/LANcade/feedback.html');
  });
});
